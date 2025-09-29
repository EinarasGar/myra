docker run --network host \
    --mount type=bind,source="$(pwd)",target=/home/schcrwlr/share \
    --rm -it schemacrawler/schemacrawler \
    /opt/schemacrawler/bin/schemacrawler.sh \
    --server postgresql \
    --host localhost \
    --port 5432 \
    --user myradev \
    --password devpassword \
    --database myra \
    --info-level=standard \
    --command script \
    --script-language python \
    --script mermaid.py