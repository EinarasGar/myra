docker run --network host \
    --mount type=bind,source="$(pwd)",target=/home/schcrwlr/share \
    --rm -it schemacrawler/schemacrawler \
    /opt/schemacrawler/bin/schemacrawler.sh \
    --server postgresql \
    --host ${POSTGRES_HOSTNAME} \
    --port ${POSTGRES_PORT} \
    --user ${POSTGRES_USER} \
    --password ${POSTGRES_PASSWORD} \
    --database ${POSTGRES_DB} \
    --info-level=standard \
    --command script \
    --script-language python \
    --script mermaid.py