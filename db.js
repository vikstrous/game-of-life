var redis = require("redis"),
    client = redis.createClient(2772, "50.30.35.9");

client.on("error", function (err) {
    console.log("Redis error " + err);
});

client.auth("e8d00846616c5645c7b093c584b4b34b");

var user_counter = 'global:nextUserId';
var memstore = {};
memstore.games = [];
memstore.gid_by_name = {};

db = {
  client: client,
  //should be called exactly once
  set_up_db: function(){
    client.set(user_counter, 1);
  },
  next_uid: function(cb){
    client.incr(user_counter, cb);
  },
  new_user: function(user, cb){
    db.next_uid(function(err, uid){
      if(err) cb(err);
      else {
        client.set('user_by_uid:' + uid, JSON.stringify(user));
        client.set('uid_by_email:' + user.email, uid);
        client.bgsave();
        cb();
      }
    });
  },
  user_by_email_exists: function(email, cb){
    client.exists('uid_by_email:'+email, cb);
  },
  user_by_email: function(email, cb){
    client.get('uid_by_email:' + email, function(err, uid){
      if(err) cb(err, uid);
      else {
        db.user_by_uid(uid, cb);
      }
    });
  },
  user_by_uid: function(uid, cb){
    client.get('user_by_uid:' + uid, function(err, data){
      cb(err, JSON.parse(data));
    });
  },
  new_game: function(data, cb){
    memstore.games.push(data);
    memstore.gid_by_name[data.name] = memstore.games.length - 1;
    if(typeof(cb) == "function") cb(null);
  },
  game_by_name: function(name, cb){
    cb(null, memstore.games[memstore.gid_by_name[name]]);
  },
  all_games: function(cb){
    cb(null, memstore.games);
  }
};

module.exports = db;
