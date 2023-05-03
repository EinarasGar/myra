#!/bin/bash

find src/view_models/ -name '*.rs' | while read line; do
    if grep -q typeshare "$line"; then
        trimmed=${line#"src/view_models/"}
        trimmed=${trimmed%".rs"}
        echo "Parsing $line. Outputting to ../../client/src/models/$trimmed.ts"
        typeshare $line --lang typescript --output-file ../../client/src/models/$trimmed.ts
        
        #remove typeshare watermark...
        sed -i 1,4d ../../client/src/models/$trimmed.ts
    fi
done
cd ../../client

echo "Formatting the outputted files"
npx prettier --write src/models/
