from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os

from app.utils.logger import logger


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    available: bool = False


mongodb = MongoDB()


async def connect_db():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "resumeness")
    try:
        mongodb.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=3000)
        # Ping to verify connection
        await mongodb.client.admin.command("ping")
        mongodb.db = mongodb.client[db_name]
        mongodb.available = True
        logger.info(f"Connected to MongoDB: {db_name}")
    except Exception as e:
        logger.warning(f"MongoDB unavailable ({e}). KB/version persistence disabled.")
        mongodb.available = False


async def close_db():
    if mongodb.client:
        mongodb.client.close()
        logger.info("Closed MongoDB connection")


def get_db():
    if not mongodb.available or mongodb.db is None:
        raise RuntimeError("MongoDB is not available. Start MongoDB or configure MONGODB_URI.")
    return mongodb.db
