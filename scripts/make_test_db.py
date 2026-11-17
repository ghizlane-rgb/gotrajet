"""Build the small GOTRAJET test database (SQLite, test data only).

Usage:
    python scripts/make_test_db.py            # writes database/gotrajet-test.db
    python scripts/make_test_db.py out.db     # custom output path

Re-running rebuilds the database from database/schema.sql, seed.sql and
seed_test_accounts.sql (Test Sender U10 + Test Traveler U11).
Dates are relative to the build day, so rebuild to refresh "tomorrow" trips.
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_DIR = ROOT / "database"


def build(out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    con = sqlite3.connect(out)
    try:
        con.execute("PRAGMA foreign_keys = ON")
        for name in ("schema.sql", "seed.sql", "seed_test_accounts.sql"):
            con.executescript((DB_DIR / name).read_text(encoding="utf-8"))
        problems = con.execute("PRAGMA foreign_key_check").fetchall()
        if problems:
            raise SystemExit(f"Foreign key problems: {problems}")
        con.commit()
        tables = [r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        print(f"Built {out}")
        for t in tables:
            print(f"  {t:16} {con.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]:>3} rows")
    finally:
        con.close()


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else DB_DIR / "gotrajet-test.db")
