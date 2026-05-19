import mysql.connector
import os

def connecter():
    connexion = mysql.connector.connect(
        host=os.getenv('MYSQLHOST', 'localhost'),
        user=os.getenv('MYSQLUSER', 'root'),
        password=os.getenv('MYSQLPASSWORD', ''),
        database=os.getenv('MYSQLDATABASE', 'todo_app'),
        port=int(os.getenv('MYSQLPORT', 3306)),
        connection_timeout=10,
        charset='utf8mb4',
        collation='utf8mb4_unicode_ci',
    )
    return connexion
