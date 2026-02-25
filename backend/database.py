import mysql.connector
import os

def connecter():
    connexion = mysql.connector.connect(
        host=os.getenv('MYSQLHOST', 'localhost'),
        user=os.getenv('MYSQLUSER', 'root'),
        password=os.getenv('MYSQLPASSWORD', ''),
        database=os.getenv('MYSQLDATABASE', 'todo_app'),
        port=int(os.getenv('MYSQLPORT', 3306))
    )
    return connexion
