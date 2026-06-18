import mysql.connector
from mysql.connector import pooling
from mysql.connector.pooling import MySQLConnectionPool
import os

_pool = None
_POOL_SIZE = max(5, min(int(os.getenv('MYSQL_POOL_SIZE', '12')), 32))


def reset_pool():
    """Recrée le pool (récupération après épuisement si connexions orphelines)."""
    global _pool
    _pool = None


def _get_pool():
    global _pool
    if _pool is None:
        _pool = MySQLConnectionPool(
            pool_name="getshift",
            pool_size=_POOL_SIZE,
            pool_reset_session=True,
            host=os.getenv('MYSQLHOST', 'localhost'),
            user=os.getenv('MYSQLUSER', 'root'),
            password=os.getenv('MYSQLPASSWORD', ''),
            database=os.getenv('MYSQLDATABASE', 'todo_app'),
            port=int(os.getenv('MYSQLPORT', 3306)),
            connection_timeout=10,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci',
        )
    return _pool


def connecter():
    last_err = None
    for attempt in range(2):
        try:
            return _get_pool().get_connection()
        except pooling.PoolError as e:
            last_err = e
            msg = str(e).lower()
            if attempt == 0 and ('pool exhausted' in msg or 'failed getting connection' in msg):
                print('[DB] Pool exhausted — reset du pool', flush=True)
                reset_pool()
                continue
            raise
    raise last_err
