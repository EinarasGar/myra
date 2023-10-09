#!/bin/bash

echo "" > '../../web/src/models/index.ts'
find src/view_models/ -name '*.rs' | while read line; do
    if grep -q typeshare "$line"; then
        trimmed=${line#"src/view_models/"}
        trimmed=${trimmed%".rs"}
        trimmed=$(sed -E 's/_([a-z])/\U\1/g' <<< "$trimmed")
        trimmed="${trimmed#_}"
        echo "Parsing $line. Outputting to ../../web/src/models/$trimmed.ts"
        typeshare $line --lang typescript --output-file ../../web/src/models/$trimmed.ts

        echo "export * from \"./$trimmed\";"  >> '../../web/src/models/index.ts'
        
        #remove typeshare watermark...
        sed -i 1,4d ../../web/src/models/$trimmed.ts

        file="../../web/src/models/$trimmed.ts"

        # Extract unique types that are not the main exported interface
        types=$(grep -oP '[A-Z][a-zA-Z0-9_]*ViewModel(?![ \t]*{)' "$file" | sort -u)

        # add empty line at the top of the file
        sed -i "1 i\\\n" $file

        # Generate import statements for the extracted types
        for type in $types; do
            filename=$(echo "$type" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')
            import_line="import { $type } from \"./$filename\";"
            
            #escape imported_line
            import_line=$(sed 's/[]\/$*.^[]/\\&/g' <<< "$import_line")
            
            # add imported_line at the top of the file
            sed -i "1 i$import_line" $file
        done
    fi
done
cd ../../web

echo "Formatting the outputted files"
npx prettier --write src/models/
