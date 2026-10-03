"""Single async MongoDB handle shared by every service in a process."""

from functools import lru_cache

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from sags.config import settings


@lru_cache
def _client() -> AsyncMongoClient:
    return AsyncMongoClient(settings().mongodb_uri, tz_aware=True)


def db() -> AsyncDatabase:
    return _client()[settings().mongodb_db]
