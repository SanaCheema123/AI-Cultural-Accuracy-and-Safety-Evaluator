from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
DATABASE = BACKEND / "culturalguard.db"
UPLOADS = BACKEND / "uploads"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Delete only CulturalGuard's local SQLite database and local upload directory."
    )
    parser.add_argument("--yes", action="store_true", help="Confirm destructive local reset.")
    args = parser.parse_args()

    if not args.yes:
        print("Nothing deleted. Re-run with --yes to reset local CulturalGuard data.")
        return 2

    removed: list[str] = []
    if DATABASE.exists():
        DATABASE.unlink()
        removed.append(str(DATABASE))
    if UPLOADS.exists():
        shutil.rmtree(UPLOADS)
        removed.append(str(UPLOADS))

    if removed:
        print("Removed local CulturalGuard data:")
        for item in removed:
            print(f"- {item}")
    else:
        print("No local CulturalGuard database or uploads were present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
