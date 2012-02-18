var redis = require("redis");
var client;

if (process.env.NODE_REDIS == 'remote') {
  client = redis.createClient(2772, "50.30.35.9");
  client.auth("e8d00846616c5645c7b093c584b4b34b");
}
else {
  client = redis.createClient();
}

client.on("error", function (err) {
    console.log("Redis error " + err);
});

var user_counter = 'global:nextUserId';
var memstore = {};
memstore.games = [];
memstore.gid_by_name = {};

//WARNING: NO EMAIL CHANGE SUPPORTED YET!!! DON'T CHANGE EMAILS YET
//ALSO NO CHANGING GAME NAMES
db = {
  client: client,
  next_uid: function(cb){
    client.incr(user_counter, cb);
  },
  list_users: function(cb){
    client.keys("user_by_uid:*", function(err, keys) {
      var done = keys.length;
      var users = [];
      for(k in keys) {
        client.get(keys[k], function(err, user){
          if (err) throw err;
          users.push(JSON.parse(user));
          done-=1;
          if (done == 0) {
            cb(null, users);
          }
        });
      }
    });
  },
  new_user: function(user, cb){
    db.next_uid(function(err, uid){
      if(typeof(cb) == 'function'){
        if(err) return cb(err);
        user.id = uid;
        client.set('user_by_uid:' + uid, JSON.stringify(user), function(err){
          if(err) return cb(err);
          client.set('uid_by_email:' + user.email, uid, function(err){
            if(err) return cb(err);
            client.bgsave();
            cb(null, user);
          });
        });
      } else {
        client.set('user_by_uid:' + uid, JSON.stringify(user));
        client.set('uid_by_email:' + user.email, uid);
        client.bgsave();
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
        db.user_by_id(uid, cb);
      }
    });
  },
  user_by_id: function(uid, cb){
    client.get('user_by_uid:' + uid, function(err, data){
      cb(err, JSON.parse(data));
    });
  },
  update_user: function(uid, user, cb){
    client.set('user_by_uid:'+uid, JSON.stringify(user));
    client.bgsave();
    cb(null, user);
    //WARNING: assume no email change
  },
  new_game: function(game, cb){
    var gid = memstore.games.length;
    memstore.games.push(game);
    memstore.gid_by_name[game.name] = gid;
    memstore.games[gid].id = gid;
    if(typeof(cb) == "function") cb(null);
  },
  game_by_name: function(name, cb){
    cb(null, memstore.games[memstore.gid_by_name[name]]);
  },
  game_by_id: function(gid, cb){
    cb(null, memstore.games[gid]);
  },
  all_games: function(cb){
    cb(null, memstore.games);
  },
  update_game: function(gid, game, cb){
    memstore.games[gid] = game;
    //WARNING: assume no game name change
    if(typeof(cb) == "function") cb(null);
  }
};

module.exports = db;
