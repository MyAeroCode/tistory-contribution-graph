cd /usr/app/server

if [ "$1" = "collect" ] || [ "$1" = "clear" ]; then
    npm install
    npx ts-node ./src $1
elif [ "$1" = "deploy" ] || [ "$1" = "remove" ]; then
    npm install

    # dotenv 생성
    if [ $storageBlogId ]; then 
        echo "storageBlogId=$storageBlogId" >> ".env" 
    fi
    if [ $client ]; then 
        echo "client=$client" >> ".env" 
    fi
    if [ $secret ]; then 
        echo "secret=$secret" >> ".env" 
    fi
    if [ $id ]; then 
        echo "id=$id" >> ".env" 
    fi
    if [ $pw ]; then 
        echo "pw=$pw" >> ".env" 
    fi
    if [ $updateRange ]; then 
        echo "updateRange=$updateRange" >> ".env" 
    fi
    if [ $includeMask ]; then 
        echo "includeMask=$includeMask" >> ".env" 
    fi
    npx serverless $1
else
    echo "유효하지 않은 명령어 : $1"
fi
