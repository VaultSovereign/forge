#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent

SHELL_FILE = ROOT / "scripts" / "forge_seven_seals.sh"
MD_FILES = [ROOT / "README.md", ROOT / "examples" / "commands.md"]

# The clarified/robust root_dir assignment
CLEAN_ROOT_DIR = 'root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." && pwd -P)"'

def update_root_dir_line(sh_path: Path) -> bool:
    if not sh_path.exists():
        print(f"skip: {sh_path} (not found)")
        return False
    text = sh_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    changed = False
    for i, line in enumerate(lines):
        # Match any variant that starts with root_dir="
        if line.strip().startswith("root_dir="):
            before = lines[i]
            lines[i] = CLEAN_ROOT_DIR
            changed = changed or (lines[i] != before)
            break

    if changed:
        backup = sh_path.with_suffix(sh_path.suffix + ".bak")
        backup.write_text(text, encoding="utf-8")
        sh_path.write_text("\n".join(lines) + ("\n" if text.endswith("\n") else ""), encoding="utf-8")
        print(f"updated: {sh_path} (backup: {backup.name})")
    else:
        print(f"ok: {sh_path} root_dir already clean")
    return changed

def normalize_bullets(md_path: Path) -> bool:
    if not md_path.exists():
        print(f"skip: {md_path} (not found)")
        return False
    text = md_path.read_text(encoding="utf-8", errors="replace")

    # Replace literal TAB • TAB with space bullet space
    new_text = text.replace("\t•\t", " • ")

    # (Optional) If a line begins with tabs then a bullet, convert each tab -> two spaces
    # Example: "\t\t• item" -> "    • item"
    def fix_leading_tabs(line: str) -> str:
        m = re.match(r"^(\t+)(•)", line)
        if not m:
            return line
        tab_count = len(m.group(1))
        return ("  " * tab_count) + "•" + line[m.end():]

    new_lines = [fix_leading_tabs(l) for l in new_text.splitlines()]
    out = "\n".join(new_lines)

    if out != text:
        backup = md_path.with_suffix(md_path.suffix + ".bak")
        backup.write_text(text, encoding="utf-8")
        md_path.write_text(out, encoding="utf-8")
        print(f"updated: {md_path} (backup: {backup.name})")
        return True

    print(f"ok: {md_path} (no \t•\t found)")
    return False

def main() -> int:
    changed_any = False
    changed_any |= update_root_dir_line(SHELL_FILE)
    for f in MD_FILES:
        changed_any |= normalize_bullets(f)
    print("done: polished" if changed_any else "done: nothing to change")
    return 0

if __name__ == "__main__":
    sys.exit(main())
