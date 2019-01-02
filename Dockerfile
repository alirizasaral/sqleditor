FROM jmfirth/webpack:latest

COPY ./app /app
RUN npm install && \
    webpack

FROM tiangolo/uwsgi-nginx-flask:python3.6

ENV STATIC_INDEX 1
ENV DB_TYPE=postgres
ENV DB_UID=postgres
ENV DB_PWD=mysecretpassword
ENV DB_HOST=127.0.0.1
ENV DB_PORT=5432
ENV DB_NAME=postgres
ENV BOOKMARKS=[]
ENV INITIAL_QUERY='SELECT * FROM SCHEMA.TABLE'

COPY --from=0 /app /app
COPY /app/index.html /app/static/index.html
RUN pip install --upgrade pip &&\
pip install -r /app/requirements.txt
