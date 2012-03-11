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
var game_counter = 'global:nextGameId';
var memstore = {};
memstore.games = [];
memstore.gid_by_name = {};
//user = {id, email, password}
//game = {id, name, state, ???}
//state: open, waiting1, waiting2, processing, archived

//only open games are indexed by name!

//WARNING: NO EMAIL CHANGE SUPPORTED YET!!! DON'T CHANGE EMAILS YET
//ALSO NO CHANGING GAME NAMES
db = {
  client: client,
  next_uid: function(cb){
    client.incr(user_counter, cb);
  },
  next_gid: function(cb){
    client.incr(game_counter, cb);
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
            client.bgsave();
            cb(err, user);
          });
        });
      } else {
        user.id = uid;
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
    cb(null);
    //WARNING: assume no email change
  },

  //every new game is open
  new_game: function(game, cb){
    if(game.state === undefined || game.name === undefined){
      if(typeof(cb) == "function") cb("Attempted to create game without name or state");
      console.error("Attempted to create game without name or state")
      console.trace();
    } else {
      db.next_gid(function(err, gid) {
        game.id = gid
        client.sadd('all_games_state_' + game.state, gid);
        client.set('game_by_gid:' + gid, JSON.stringify(game), function(err){
          if(err) return cb(err);
          client.set('gid_by_name:' + game.name, gid, function(err){
            if(typeof(cb) == "function") cb(err);
          });
        });
      });
    }
  },
  game_by_name: function(name, cb){
    client.get('gid_by_name:' + name, function(err, gid){
      if(err) cb(err, gid);
      else {
        db.game_by_id(gid, cb);
      }
    });
  },
  game_by_id: function(gid, cb){
    client.get('game_by_gid:' + gid, function(err, data){
      cb(err, JSON.parse(data));
    });
  },
  games_by_ids: function(gids, cb){
    for (i in gids){
      gids[i] = 'game_by_gid:' + gids[i];
    }
    client.mget(gids, function(err, data){
      for(i in data){
        data[i] = JSON.parse(data[i]);
      }
      cb(err, data);
    });
  },
  all_gids_in_state: function(state, cb){
    client.smembers('all_games_state_'+state, cb);
  },
  game_state_change: function(gid, new_state, cb){
    db.game_by_id(gid, function(err, game){
      if(err) throw err;
      client.smove('all_games_state_'+game.state, 'all_games_state_'+new_state, gid, function(err){
        if(err) throw err;
        game.state = new_state;
        client.set('game_by_gid:'+gid, JSON.stringify(game));
        if(typeof(cb) == "function") cb(err);
      });
    });
  },
  delete_game: function(game, cb){
    client.del('game_by_gid:'+game.id, function(err){
      if(err) throw err;
      client.srem('all_games_state_'+game.state, game.id, function(err){
        if(game.state == 'open'){
          client.del('game_by_name:'+game.name, cb);
        } else {
          cb(null);
        }
      });
    });
  },
  update_game: function(gid, game, cb){
    db.game_by_id(gid, function(err, old_game){
      if(old_game.state != game.state){
        db.game_state_change(gid, game.state, function(err){
          client.set('game_by_gid:'+gid, JSON.stringify(game));
          if(typeof(cb) == "function") cb(err);
        });
      } else {
        client.set('game_by_gid:'+gid, JSON.stringify(game));
      if(typeof(cb) == "function") cb(err);
      }
    })
    //WARNING: assume no game name change
  }
};

module.exports = db;
