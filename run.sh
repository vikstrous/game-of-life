nodeins_found=`ps -ef|grep -v grep|grep node-inspect|awk '{print $9}'`
if test -z $nodeins_found 
then
node-inspector &
else
echo "node inspector already running"
fi

NODE_ENV=development nodemon server.js --debug
