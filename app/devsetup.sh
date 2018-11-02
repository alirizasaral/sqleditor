export DB_TYPE=db2
export DB_UID=cisadm
export DB_PWD=adm4cis$
export DB_HOST=sla20958.srv.allianz
export DB_PORT=51000
export DB_NAME=DTCBOX19
export BOOKMARKS="['SELECT * FROM ABS.TVERSION;', 'SELECT DISTINCT(anlagejahr || \' \' || nummer) AS Claims FROM ABS.TSCHADEN;']"
export INITIAL_QUERY='SELECT * FROM ABS.TVERSION;'
python main.py

