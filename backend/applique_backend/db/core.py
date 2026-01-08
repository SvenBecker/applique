from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.asyncio.engine import AsyncEngine
from sqlalchemy.orm import DeclarativeBase

from applique_backend.core.settings import Settings


class Base(AsyncAttrs, DeclarativeBase):
    pass


async def setup_db(settings: Settings) -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    """Setup database connection."""
    engine = create_async_engine(settings.DATABASE_DSN, echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    return engine, session_maker
