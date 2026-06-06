"""A small Python API server."""
import os

DATABASE_URL = os.environ["DATABASE_URL"]
API_KEY = os.getenv("API_KEY")
REDIS_URL = os.environ.get("REDIS_URL")


def config() -> dict:
    return {
        "database_url": DATABASE_URL,
        "api_key": API_KEY,
        "redis_url": REDIS_URL,
    }
