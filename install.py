#!/usr/bin/env python3
"""Install/uninstall this directory in a macOS Typora bundle."""
import argparse
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("app", nargs="?", default="/Applications/Typora.app")
parser.add_argument("--uninstall", action="store_true")
args = parser.parse_args()
resources = Path(args.app) / "Contents/Resources/TypeMark"
index = resources / "index.html"
text = index.read_text()
hook = ('\t<!-- plume-blocks:start -->\n'
        '\t<script src="./plume-blocks/plume-blocks.js" defer></script>\n'
        '\t<!-- plume-blocks:end -->\n')
if args.uninstall:
    if "<!-- plume-blocks:start -->" in text and hook not in text:
        raise SystemExit("Plugin hook has changed; inspect index.html before uninstalling.")
    index.write_text(text.replace(hook, ""))
    print("Plume Blocks disabled. Reopen Typora windows to apply.")
else:
    if './appsrc/main.js' not in text or '</head>' not in text:
        raise SystemExit("Unsupported Typora layout: expected macOS TypeMark/index.html.")
    destination = resources / "plume-blocks"
    source = Path(__file__).resolve().parent
    if source != destination.resolve():
        shutil.copytree(source, destination, dirs_exist_ok=True)
    if "<!-- plume-blocks:start -->" not in text:
        backup = index.with_name("index.html.before-plume-blocks")
        if not backup.exists():
            shutil.copy2(index, backup)
        index.write_text(text.replace('</head>', hook + '</head>', 1))
    print("Plume Blocks installed. Reopen Typora windows to apply.")
