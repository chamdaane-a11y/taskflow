import mysql.connector

def connecter():
    connexion = mysql.connector.connect(
        host="localhost",
        user="hamdaane",
        password="atanda",
        database="todo_app"
    )
    return connexion