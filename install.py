#!/usr/bin/env python3
"""Install Plume Blocks and its per-user automatic repair agent on macOS."""
import argparse
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

LABEL = "local.typora.plume-blocks"
HOOK = ('\t<!-- plume-blocks:start -->\n'
        '\t<script src="./plume-blocks/plume-blocks.js" defer></script>\n'
        '\t<!-- plume-blocks:end -->\n')
RUNTIME = Path.home() / "Library/Application Support/TyporaPlumeBlocks"
AGENT = Path.home() / "Library/LaunchAgents" / (LABEL + ".plist")


def write_changed(path, data):
    """Replace complete files atomically, without waking watchers on no-op runs."""
    if path.exists() and path.read_bytes() == data:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as file:
        temporary = Path(file.name)
        file.write(data)
    try:
        temporary.chmod(path.stat().st_mode & 0o777 if path.exists() else 0o644)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return True


def repair(app, source):
    resources = app / "Contents/Resources/TypeMark"
    index = resources / "index.html"
    # A bundle can be absent briefly while the official updater replaces it.
    if not index.exists():
        return False
    original = index.read_bytes()
    text = original.decode("utf-8")
    if './appsrc/main.js' not in text or '</head>' not in text:
        raise RuntimeError("Unsupported Typora layout; index.html was not modified.")
    if ('<!-- plume-blocks:start -->' in text or '<!-- plume-blocks:end -->' in text) and text.count(HOOK) != 1:
        raise RuntimeError("Plugin loader has changed; inspect index.html before repair.")
    destination = resources / "plume-blocks"
    changed = False
    for name in ("plume-blocks.js", "VERSION"):
        changed = write_changed(destination / name, (source / name).read_bytes()) or changed
    if HOOK not in text:
        # Back up this release's HTML, never restore an older Typora release.
        write_changed(index.with_name("index.html.before-plume-blocks"), original)
        if index.read_bytes() != original:
            raise RuntimeError("Typora changed during repair; the next run will retry.")
        write_changed(index, text.replace('</head>', HOOK + '</head>', 1).encode("utf-8"))
        changed = True
    return changed


def agent_config(app, runtime, python):
    return {
        "Label": LABEL,
        "ProgramArguments": [python, str(runtime / "install.py"), str(app), "--repair"],
        "RunAtLoad": True,
        "StartInterval": 60,
        "WatchPaths": [str(app.parent), str(app / "Contents/Resources/TypeMark/index.html")],
        "ProcessType": "Background",
        "StandardOutPath": str(runtime / "repair.log"),
        "StandardErrorPath": str(runtime / "repair.log"),
    }


def unload_agent():
    service = f"gui/{os.getuid()}/{LABEL}"
    loaded = subprocess.run(["launchctl", "print", service], capture_output=True)
    if loaded.returncode == 0:
        subprocess.run(["launchctl", "bootout", service], check=True)


def remove_loader(app):
    index = app / "Contents/Resources/TypeMark/index.html"
    if not index.exists():
        return
    text = index.read_text()
    if ('<!-- plume-blocks:start -->' in text or '<!-- plume-blocks:end -->' in text) and text.count(HOOK) != 1:
        raise RuntimeError("Plugin loader has changed; inspect index.html before uninstalling.")
    write_changed(index, text.replace(HOOK, "").encode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("app", nargs="?", default="/Applications/Typora.app")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--repair", action="store_true", help="Internal: one quiet repair pass")
    mode.add_argument("--uninstall", action="store_true", help="Disable automatic repair and remove the loader")
    args = parser.parse_args()
    app = Path(args.app).expanduser().absolute()
    source = Path(__file__).resolve().parent
    if args.uninstall:
        unload_agent()
        AGENT.unlink(missing_ok=True)
        remove_loader(app)
        print("Plume Blocks disabled, including automatic repair. Reopen Typora windows to apply.")
    elif args.repair:
        if repair(app, source):
            print("Restored Plume Blocks. Reopen Typora windows to load the plugin.", flush=True)
    else:
        if not (app / "Contents/Resources/TypeMark/index.html").is_file():
            raise RuntimeError(f"Typora's macOS editor was not found at {app}.")
        # Freeze a deployed copy outside both the app and the development repo.
        unload_agent()
        for name in ("install.py", "plume-blocks.js", "VERSION"):
            write_changed(RUNTIME / name, (source / name).read_bytes())
        repair(app, RUNTIME)
        python = shutil.which("python3") or sys.executable
        write_changed(AGENT, plistlib.dumps(agent_config(app, RUNTIME, python)))
        subprocess.run(["launchctl", "enable", f"gui/{os.getuid()}/{LABEL}"], check=True)
        subprocess.run(["launchctl", "bootstrap", f"gui/{os.getuid()}", str(AGENT)], check=True)
        print(f"Plume Blocks {(source / 'VERSION').read_text().strip()} installed with automatic repair.")
        print(f"Runtime: {RUNTIME}\nAgent: {AGENT}\nReopen Typora windows to apply.")


if __name__ == "__main__":
    main()
