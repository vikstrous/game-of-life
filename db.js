var redis = require("redis"),
    client = redis.createClient(2772, "50.30.35.9");

client.on("error", function (err) {
    console.log("Redis error " + err);
});

client.auth("e8d00846616c5645c7b093c584b4b34b");

//TODO: provide a database abstraction
module.exports = {
  client: client
}
