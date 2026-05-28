"""Load mock demo data (local dev). Safe to run multiple times — skips if already seeded."""

import logging

from sqlmodel import Session

from app.core.db import engine, init_db
from app.services.mock_data import seed_mock_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Seeding mock data")
    with Session(engine) as session:
        init_db(session)
        seed_mock_data(session)
    logger.info("Mock data seed finished")


if __name__ == "__main__":
    main()
