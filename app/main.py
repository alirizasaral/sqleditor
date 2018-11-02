from flask import Flask
from flask import render_template
from flask import request, send_from_directory
import json
import ibm_db
import re
import os
from sqlalchemy import create_engine

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

class DB2:

    def __init__(self, configuration):
        self.connection_string = self.create_db_url(configuration)

    def create_db_url(self, configuration):
        return 'DATABASE={DB_NAME};HOSTNAME={DB_HOST};PORT={DB_PORT};PROTOCOL=TCPIP;UID={DB_UID};PWD={DB_PWD}'.format(**configuration)

    def connect(self):
        connection = ibm_db.connect(self.connection_string, '', '')
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

def check_env():
    config_values = {}
    missing_values = []
    for key in ['DB_UID', 'DB_PWD', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_TYPE']:
        config_values[key] = os.environ.get(key)
        if not config_values[key]:
            missing_values.append(key)
    
    if len(missing_values) > 0:
        print("Following mandatory environment variables are missing: " + str(missing_values))
        exit()
    else:
        return config_values

class PostgresDB:

    def __init__(self, configuration):
        self.engine = create_engine(self.create_db_url(configuration), convert_unicode=True)

    def create_db_url(self, configuration):
        return 'postgresql+psycopg2://{DB_UID}:{DB_PWD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'.format(**configuration)
    
    def process_result(self, result):
        values = result.fetchall()
        return [dict(zip(result.keys(), value)) for value in values]
    
    def execute_one(self, query):
        try:
            result = self.engine.execute(query)
            if result.returns_rows:
                return {'result': self.process_result(result), 'message': '1 Query executed.'}, 200
            elif result.is_insert:
                return {'result': [], 'message': '1 record inserted.'}, 200
            elif result.rowcount > 0:
                return {'result': [], 'message': '{} record(s) updated.'.format(result.rowcount)}, 200 
            else:
                return {'result': [], 'message': 'Query executed.'}, 200
        except Exception as e:
            app.logger.exception('Exception executing query: ' + query)
            return {'result': [], 'message': 'Query failed: ' + str(e)}, 500 

class DBFactory:

    def __init__(self):
        self.db_types = {}
    
    def register(self, db_name, db_class):
        self.db_types[db_name] = db_class
    
    def create(self, configuration):
        db_type = configuration['DB_TYPE']
        if not db_type in self.db_types:
            print('DB-Type "{type}" not recognized. Supported DB-Types are: {types}'.format(type=db_type, types=', '.join(self.db_types.keys())))
            exit()        
        return self.db_types[db_type](configuration)


factory = DBFactory()
factory.register('postgres', PostgresDB)
factory.register('db2', DB2)

configuration = check_env()
db = factory.create(configuration)
app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('./', 'index.html')

@app.route('/config')
def config():
    config = {'bookmarks': os.environ.get('BOOKMARKS'),
            'initial_query': os.environ.get('INITIAL_QUERY')}
    return json.dumps(config, indent=4, sort_keys=True, default=str), 200


@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/execute', methods=['POST'])
def execute():
    print("here")
    query = request.get_json(force=True)['query']
    app.logger.info('executing query: %s', query)
    result, return_code = db.execute_one(query)
    return json.dumps(result, indent=4, sort_keys=True, default=str), return_code

if __name__ == "__main__":
    app.run(host= '0.0.0.0', debug=True)