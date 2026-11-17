from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_sqlite = settings.database_url.startswith("sqlite")
engine = create_engine(
    settings.database_url,
    # PostgreSQL: no server-side prepared statements, so connection poolers (Neon's PgBouncer) work.
    connect_args={"check_same_thread": False} if _sqlite else {"prepare_threshold": None},
    pool_pre_ping=True,
    # Serverless (Vercel): many small copies of the app, each keeps only a few connections.
    **({"pool_size": 2, "max_overflow": 3, "pool_recycle": 300} if settings.on_vercel and not _sqlite else {}),
)

if _sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(conn, _record):
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
