nodeins_found=`ps -ef|grep -v grep|grep node-inspect|awk '{print $9}'`
if test -z $nodeins_found 
then
node-inspector &
else
echo "node inspector already running"
fi

redis_found=`ps -ef|grep -v grep|grep redis-server|awk '{print $9}'`
if test -z $redis_found 
then
redis-server 2>/dev/null > /dev/null &
else
echo "redis server already running"
fi

NODE_ENV=development NODE_PORT=3000 NODE_REDIS=local nodemon --debug server.js
