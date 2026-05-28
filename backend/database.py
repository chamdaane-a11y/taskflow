import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool
import os

_pool = None

def _get_pool():
    global _pool
    if _pool is None:
        _pool = MySQLConnectionPool(
            pool_name="getshift",
            pool_size=10,
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
    return _get_pool().get_connection()
