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

function init_numeric_fields(obj, fields){
  for (f in fields){
    if(obj[fields[f]] == undefined)
      obj[fields[f]] = 0;
  }
  return obj;
}

var user_counter = 'global:nextUserId';
var game_counter = 'global:nextGameId';
var memstore = {};

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
  //doesn't work well?
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
    user = init_numeric_fields(user, ['wins', 'losses', 'ties']);
    db.next_uid(function(err, uid){
      user.id = uid;
      client.mset('user_by_uid:' + uid, JSON.stringify(user), 'uid_by_email:' + user.email, uid, cb);
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
    client.set('user_by_uid:'+uid, JSON.stringify(user), cb);
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
        client.mset('game_by_gid:' + gid, JSON.stringify(game), 'open_gid_by_name:' + game.name, gid, cb);
      });
    }
  },
  game_by_name: function(name, cb){
    client.get('open_gid_by_name:' + name, function(err, gid){
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
      if(new_state == 'archived'){
        client.del('open_gid_by_name:' + game.name)
      }
      game.state = new_state;
      client.multi()
        .smove('all_games_state_'+game.state, 'all_games_state_'+new_state, gid)
        .set('game_by_gid:'+gid, JSON.stringify(game))
        .exec(cb);
    });
  },
  delete_game: function(game, cb){
    var m = client.multi();
    m.del('game_by_gid:'+game.id);
    m.srem('all_games_state_'+game.state, game.id);
    if(game.state == 'open'){
      m.del('game_by_name:'+game.name);
    };
    m.exec(cb);
  },
  update_game: function(gid, game, cb){
    db.game_by_id(gid, function(err, old_game){
      var m = client.multi();
      if(old_game.state != game.state) {
        m.smove('all_games_state_'+old_game.state, 'all_games_state_'+game.state, gid);
      }
      m.set('game_by_gid:'+gid, JSON.stringify(game));
      m.exec(cb);
    });
    //WARNING: assume no game name change
  }
};

module.exports = db;
