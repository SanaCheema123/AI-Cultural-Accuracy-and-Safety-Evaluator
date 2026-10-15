"""Regenerate the streamlined architecture/workflow diagrams from Graphviz DOT files.

Requires Graphviz (`dot`) to be installed and available on PATH.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "diagrams"


def render(name: str, width_dpi: int = 180) -> None:
    dot = shutil.which("dot")
    if not dot:
        raise SystemExit("Graphviz 'dot' is required to regenerate diagrams")
    source = OUT / f"{name}.dot"
    if not source.exists():
        raise SystemExit(f"Missing diagram source: {source}")
    subprocess.run([dot, "-Tsvg", str(source), "-o", str(OUT / f"{name}.svg")], check=True)
    subprocess.run(
        [dot, "-Tpng", f"-Gdpi={width_dpi}", str(source), "-o", str(OUT / f"{name}.png")],
        check=True,
    )


def main() -> None:
    render("workflow")
    render("architecture")
    print(OUT / "workflow.png")
    print(OUT / "architecture.png")


if __name__ == "__main__":
    main()
