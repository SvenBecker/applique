import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed

from applique_backend.core.settings import Settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("applique_backend.prestart")

MAX_TRIES = 60 * 5  # 5 minutes (1 try/sec)
WAIT_SECONDS = 1


@retry(
    stop=stop_after_attempt(MAX_TRIES),
    wait=wait_fixed(WAIT_SECONDS),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARNING),
    reraise=True,
)
async def init(db_engine: AsyncEngine) -> None:
    try:
        async with db_engine.connect() as conn:
            await conn.execute(select(1))
    except Exception:
        logger.exception("Database not ready yet")
        raise


async def main() -> None:
    settings = Settings()
    engine = create_async_engine(settings.DATABASE_DSN)

    logger.info("Initializing service")
    try:
        await init(engine)
        logger.info("Service finished initializing")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
