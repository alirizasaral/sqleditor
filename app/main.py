from flask import Flask
from flask import render_template
from flask import request, send_from_directory
import json
import ibm_db
import re
import os

class SQLStatement:

    def __init__(self, sql):
        self.sql = sql.strip()

    def is_valid(self):
        valid, reason = self.check_sql(self.sql)
        return valid

    def validation_failure_result(self):
        valid, reason = self.check_sql(self.sql)
        if valid:
            return {'result': [], 'message': reason}, 200
        return {'result': [], 'message': reason}, 400

    def check_sql(self, sql):
        if len(sql) == 0:
            return False, 'Empty Query not allowed.'
        return True, ''

    def execute(self, conn):
        try:
            stmt = ibm_db.exec_immediate(conn, self.sql)
            if ibm_db.num_fields(stmt) > 0:
                result = []
                dictionary = ibm_db.fetch_assoc(stmt)
                print("here")
                while dictionary != False:
                    result.append(dictionary)
                    dictionary = ibm_db.fetch_assoc(stmt)
                return {'result': result, 'message': '1 Query executed.'}, 200
            else:
                return {'result': [], 'message': str(ibm_db.num_rows(stmt)) + 'rows affected.'}, 200
        except Exception as e:
            app.logger.error(e)
            msg = ibm_db.stmt_errormsg()
            if not msg:
                msg = str(e)
            return {'result': [], 'message': 'Query failed: ' + msg}, 500

class DB:

    def __init__(self):
        self.host, self.port, self.database, self.username, self.password = self.retrieve_connection_params()

    def retrieve_connection_envs(self):
        values = {}
        for key in ['ABSDB_JDBCURL', 'ABSDB_USERNAME_PLAIN', 'ABSDB_PASSWORD_PLAIN']:
            values[key] = os.environ.get(key)
            if not values[key]:
                raise ValueError('Missing environtment variable ' + key)
                exit()
        return values

    def retrieve_connection_host(self, jdbc_url):
        m = re.search("(^[\w|\.]+)\:([\d]+)+\/([\w]+)", jdbc_url)
        if len(m.groups()) != 3:
            raise ValueError('Host, port and database could not be found in the environtment variable ABSDB_JDBCURL: ' + jdbc_url)
            exit()
        
        host, port, database = m.group(1), m.group(2), m.group(3)
        return host, port, database

    def retrieve_connection_params(self):
        envs = self.retrieve_connection_envs()
        host, port, database = self.retrieve_connection_host(envs['ABSDB_JDBCURL'])
        return host, port, database, envs['ABSDB_USERNAME_PLAIN'], envs['ABSDB_PASSWORD_PLAIN']

    def connect(self):
        connection = ibm_db.connect('DATABASE={};HOSTNAME={};PORT={};PROTOCOL=TCPIP;UID={};PWD={}'.format(self.database, self.host, self.port, self.username, self.password), '', '')
        return connection

    def execute_one(self, sql):
        stmt = SQLStatement(sql)
        if not stmt.is_valid():
            return stmt.validation_failure_result()

        conn = None
        try:
            conn = self.connect()
            return stmt.execute(conn)
        except Exception as e:
            app.logger.error(e)
            return {'result': [], 'message': 'Query failed: ' + str(e)}, 500
        finally:
            if conn:
                ibm_db.close(conn)


db = DB()
app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('./', 'index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/execute', methods=['POST'])
def execute():
    sqls = request.get_json(force=True)['sqls']
    result, return_code = db.execute_one(sqls)
    return json.dumps(result, indent=4, sort_keys=True, default=str), return_code

if __name__ == "__main__":
    app.run(host= '0.0.0.0', debug=True)