"""Exercise deployment against disposable app bundles, never the real Typora."""
import importlib.util
from pathlib import Path
import plistlib
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("installer", ROOT / "install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.app = self.root / "Typora.app"
        self.index = self.app / "Contents/Resources/TypeMark/index.html"
        self.runtime = self.root / "Application Support/TyporaPlumeBlocks"
        self.runtime.mkdir(parents=True)
        for name in ("plume-blocks.js", "VERSION"):
            shutil.copy2(ROOT / name, self.runtime / name)
        self.fresh_bundle("release-one")

    def fresh_bundle(self, release):
        self.index.parent.mkdir(parents=True, exist_ok=True)
        self.original = f'<html><head><script src="./appsrc/main.js"></script><!-- {release} --></head><body></body></html>'
        self.index.write_text(self.original)

    def test_install_and_idle_runs_do_not_rewrite_files(self):
        self.assertTrue(installer.repair(self.app, self.runtime))
        before = {p: p.stat().st_mtime_ns for p in self.app.rglob("*")}
        self.assertFalse(installer.repair(self.app, self.runtime))
        self.assertEqual(before, {p: p.stat().st_mtime_ns for p in self.app.rglob("*")})
        self.assertEqual(self.index.read_text().count(installer.HOOK), 1)

    def test_full_official_bundle_replacement(self):
        installer.repair(self.app, self.runtime)
        shutil.rmtree(self.app)
        self.assertFalse(installer.repair(self.app, self.runtime))
        self.assertFalse(self.app.exists())
        self.fresh_bundle("release-two-with-upstream-changes")
        self.assertTrue(installer.repair(self.app, self.runtime))
        self.assertEqual(self.index.read_text().replace(installer.HOOK, ""), self.original)
        self.assertEqual(self.index.with_name("index.html.before-plume-blocks").read_text(), self.original)
        self.assertEqual((self.index.parent / "plume-blocks/plume-blocks.js").read_bytes(), (ROOT / "plume-blocks.js").read_bytes())

    def test_in_place_update_refreshes_backup(self):
        installer.repair(self.app, self.runtime)
        self.fresh_bundle("release-two")
        installer.repair(self.app, self.runtime)
        self.assertEqual(self.index.with_name("index.html.before-plume-blocks").read_text(), self.original)

    def test_missing_or_changed_plugin_is_restored(self):
        installer.repair(self.app, self.runtime)
        script = self.index.parent / "plume-blocks/plume-blocks.js"
        script.unlink()
        self.assertTrue(installer.repair(self.app, self.runtime))
        script.write_text("obsolete plugin")
        self.assertTrue(installer.repair(self.app, self.runtime))
        self.assertEqual(script.read_bytes(), (ROOT / "plume-blocks.js").read_bytes())

    def test_unsupported_layout_and_changed_hook_fail_without_modification(self):
        for text in ("<html>new editor</html>", self.original.replace("</head>", "<!-- plume-blocks:start -->changed</head>")):
            self.index.write_text(text)
            with self.assertRaises(RuntimeError):
                installer.repair(self.app, self.runtime)
            self.assertEqual(self.index.read_text(), text)
            self.assertFalse((self.index.parent / "plume-blocks").exists())

    def test_uninstall_keeps_unrelated_edits(self):
        installer.repair(self.app, self.runtime)
        self.index.write_text(self.index.read_text().replace("</body>", "upstream edit</body>"))
        installer.remove_loader(self.app)
        self.assertEqual(self.index.read_text(), self.original.replace("</body>", "upstream edit</body>"))
        installer.remove_loader(self.app)

    def test_agent_uses_durable_source_and_periodic_repair(self):
        config = installer.agent_config(self.app, self.runtime, sys.executable)
        restored = plistlib.loads(plistlib.dumps(config))
        self.assertEqual(restored["ProgramArguments"], [sys.executable, str(self.runtime / "install.py"), str(self.app), "--repair"])
        self.assertTrue(restored["RunAtLoad"])
        self.assertEqual(restored["StartInterval"], 60)
        self.assertIn(str(self.app.parent), restored["WatchPaths"])

    def test_uninstall_stops_agent_before_removing_loader(self):
        agent = self.root / "LaunchAgents/plugin.plist"
        agent.parent.mkdir()
        agent.write_text("registered")
        events = []
        with patch.object(sys, "argv", ["install.py", str(self.app), "--uninstall"]), \
                patch.object(installer, "AGENT", agent), \
                patch.object(installer, "unload_agent", side_effect=lambda: events.append("unload")), \
                patch.object(installer, "remove_loader", side_effect=lambda app: events.append(("remove", agent.exists()))), \
                patch("builtins.print"):
            installer.main()
        self.assertEqual(events, ["unload", ("remove", False)])


if __name__ == "__main__":
    unittest.main()
