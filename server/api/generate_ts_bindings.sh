#!/bin/bash

find src/view_models/ -name '*.rs' | while read line; do
    if grep -q typeshare "$line"; then
        trimmed=${line#"src/view_models/"}
        trimmed=${trimmed%".rs"}
        trimmed=$(sed -E 's/_([a-z])/\U\1/g' <<< "$trimmed")
        trimmed="${trimmed#_}"
        echo "Parsing $line. Outputting to ../../web/src/models/$trimmed.ts"
        typeshare $line --lang typescript --output-file ../../web/src/models/$trimmed.ts
        
        #remove typeshare watermark...
        sed -i 1,4d ../../web/src/models/$trimmed.ts
    fi
done
cd ../../web

echo "Formatting the outputted files"
npx prettier --write src/models/
