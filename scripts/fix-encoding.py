#!/usr/bin/env python3
"""
Detecta y corrige texto corrupto por codificación (mojibake / UTF-8 mezclado).

Uso:
  python scripts/fix-encoding.py          # solo reporta
  python scripts/fix-encoding.py --fix    # corrige archivos afectados
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    "vendor",
    "__pycache__",
}
BINARY_EXT = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".zip",
    ".gz",
    ".7z",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".mp4",
    ".mp3",
    ".wav",
    ".bin",
    ".pyc",
    ".lock",
}
TEXT_EXT = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".scss",
    ".py",
    ".sql",
    ".sh",
    ".ps1",
    ".xml",
    ".csv",
}
# Secuencias mojibake (escapadas para no auto-corromper este archivo)
MOJIBAKE_MARKERS = (
    "\u00c3\u00a1",  # Ã¡
    "\u00c3\u00a9",  # Ã©
    "\u00c3\u00ad",  # Ã­
    "\u00c3\u00b3",  # Ã³
    "\u00c3\u00ba",  # Ãº
    "\u00c3\u00b1",  # Ã±
    "\u00c3\u0192",  # Ãƒ
    "\u00c3\u0192\u00c2",  # ÃƒÂ
    "\u00e2\u20ac",  # â€
    "\u00c2\u00bf",  # Â¿
    "\u00c2\u00a1",  # Â¡
)
SKIP_FILES = {"scripts/fix-encoding.py"}


def is_text_file(path: Path) -> bool:
    if path.suffix.lower() in BINARY_EXT:
        return False
    if path.suffix.lower() in TEXT_EXT:
        return True
    return path.name in {".env", ".gitignore", ".editorconfig"}


def has_mojibake(text: str) -> bool:
    if "\ufffd" in text:
        return True
    return any(marker in text for marker in MOJIBAKE_MARKERS)


def line_has_mojibake(line: str) -> bool:
    return any(marker in line for marker in MOJIBAKE_MARKERS)


def fix_line(line: str) -> str:
    if not line_has_mojibake(line):
        return line
    try:
        return line.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return line


def fix_mixed_utf8(data: bytes) -> str:
    out: list[str] = []
    i = 0
    n = len(data)
    while i < n:
        b = data[i]
        if b < 0x80:
            out.append(chr(b))
            i += 1
            continue
        decoded = False
        for size in (2, 3, 4):
            if i + size > n:
                continue
            seq = data[i : i + size]
            try:
                out.append(seq.decode("utf-8"))
                i += size
                decoded = True
                break
            except UnicodeDecodeError:
                pass
        if not decoded:
            out.append(bytes([b]).decode("cp1252"))
            i += 1
    return "".join(out)


def read_text(data: bytes) -> tuple[str, str]:
    try:
        return data.decode("utf-8"), "utf8"
    except UnicodeDecodeError:
        return fix_mixed_utf8(data), "mixed"


def iter_text_files() -> list[Path]:
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for filename in filenames:
            path = Path(dirpath) / filename
            if is_text_file(path):
                files.append(path)
    return files


def process_file(path: Path, apply_fix: bool) -> tuple[str, str] | None:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    if rel in SKIP_FILES:
        return None

    try:
        data = path.read_bytes()
    except OSError:
        return None

    text, encoding_kind = read_text(data)
    mojibake = has_mojibake(text)
    fixed_lines = [fix_line(line) for line in text.splitlines(keepends=True)]
    fixed = "".join(fixed_lines)
    needs_save = encoding_kind == "mixed" or (mojibake and fixed != text)

    if encoding_kind != "mixed" and not mojibake:
        return None

    issue = "mixed" if encoding_kind == "mixed" else "mojibake"
    if apply_fix and needs_save:
        path.write_text(fixed, encoding="utf-8", newline="")
        return rel, f"fixed ({issue})"
    return rel, issue


def main() -> int:
    parser = argparse.ArgumentParser(description="Detecta/corrige encoding corrupto")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Aplica correcciones en los archivos afectados",
    )
    args = parser.parse_args()

    results: list[tuple[str, str]] = []
    for path in iter_text_files():
        result = process_file(path, args.fix)
        if result:
            results.append(result)

    print(f"Archivos revisados: {len(iter_text_files())}")
    print(f"Afectados: {len(results)}")
    for rel, status in sorted(results):
        print(f"  [{status}] {rel}")

    if results and not args.fix:
        print("\nEjecuta con --fix para corregir automáticamente.")
        return 1
    return 0 if not results else 0


if __name__ == "__main__":
    sys.exit(main())
