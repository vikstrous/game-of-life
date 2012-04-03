var redis = require("redis");
var client;

if (process.env.NODE_REDIS == 'local') {
  client = redis.createClient();
}
else {
  client = redis.createClient(2772, "50.30.35.9");
  client.auth("e8d00846616c5645c7b093c584b4b34b");
}

client.on("error", function (err) {
    console.log("Redis error " + err);
});

function init_numeric_fields(obj, fields){
  if(typeof obj === 'string'){
    obj = JSON.parse(obj);
  }
  for (f in fields){
    if(obj[fields[f]] == undefined)
      obj[fields[f]] = 0;
  }
  return obj;
}
function init_list_fields(obj, fields){
  if(typeof obj === 'string'){
    obj = JSON.parse(obj);
  }
  for (f in fields){
    if(obj[fields[f]] == undefined)
      obj[fields[f]] = [];
  }
  return obj;
}

function extract(obj1, properties, obj2){
  if(!obj1){
    obj1 = {};
  }
  if(typeof obj1 === 'string'){
    obj1 = JSON.parse(obj1);
  }
  if(typeof obj2 !== 'object' || obj2 === null){
    obj2 = {};
  }
  for (p in properties){
    obj2[properties[p]] = obj1[properties[p]];
  }
  return obj2;
}

//user = {id, email, password}
var User = function(data){
  data = init_list_fields(data, ['wins', 'losses', 'ties']);
  extract(data, this.properties, this);
}

User.prototype = {
  properties: ['id', 'email', 'password', 'wins', 'losses', 'ties', 'isAdmin'],
  save: function(cb){
    //new
    var self = this;
    if(this.id == undefined){
      Users.next_uid(function(err, uid){
        if(err) throw err;
        console.log(uid);
        self.id = uid;
        client.mset('user_by_uid:' + uid, JSON.stringify(extract(self, self.properties)), 
          'uid_by_email:' + self.email, uid, cb);
      });
    //existing 
    } else {
      client.get('user_by_uid:'+this.id, function(err, old_user){
        if(err) throw err;
        var m = client.multi();
        if(old_user.email != self.email){
          m.del('uuid_by_email:'+old_user.email);
          m.set('uuid_by_email:'+self.email, self.id);
        }
        m.set('user_by_uid:'+self.id, JSON.stringify(extract(self, self.properties)));
        m.exec(cb);
      });
    }
  },
  win:function(gid, cb){
    this.wins.push(gid);
    this.save(cb);
  },
  lose:function(gid, cb){
    this.losses.push(gid);
    this.save(cb);
  },
  tie:function(gid, cb){
    this.ties.push(gid);
    this.save(cb);
  }
}

var Users = {
  next_uid: function(cb){
    client.incr('global:nextUserId', cb);
  },
  by_email_exists: function(email, cb){
    client.exists('uid_by_email:'+email, cb);
  },
  by_email: function(email, cb){
    client.get('uid_by_email:' + email, function(err, uid){
      if(err) cb(err, uid);
      else {
        Users.by_id(uid, cb);
      }
    });
  },
  by_id: function(uid, cb){
    client.get('user_by_uid:' + uid, function(err, data){
      cb(err, data?new User(data):false);
    });
  },
  //TODO: improve this?
  list: function(cb){
    client.keys("user_by_uid:*", function(err, keys) {
      client.mget(keys, function(err, users){
        for(i in users){
          users[i] = new User(users[i]);
        }
        cb(err, users);
      });
    });
  }
}

//game = {id, name, state, ???}
//state: open, waiting1, waiting2, processing, archived
//only open games are indexed by name!
var Game = function(data){
  extract(data, this.properties, this);
}

//TODO: eliminate need for properties list using getters and setters?
Game.prototype = {
  properties: ['id', 'name', 'state', 'start_state', 'grid_size', 'players', 'sockets'],
  save: function(cb){
    var self = this;
    //new
    if(this.id == undefined){
      Games.next_gid(function(err, gid) {
        self.id = gid;
        var m = client.multi();
        m.sadd('all_games_state_'+self.state, self.id);
        if(self.state == 'open'){
          m.set('open_gid_by_name:' + self.name, self.id);
        }
        m.set('game_by_gid:'+self.id, JSON.stringify(
          extract(self, self.properties)));
        m.exec(cb);
      });
    //update
    } else {
      Games.by_id(this.id, function(err, old_game){
        var m = client.multi();
        if(old_game.state != self.state) {
          m.smove('all_games_state_'+old_game.state, 'all_games_state_'+self.state, self.id);
        }
        if(old_game.state != 'open' && self.state == 'open'){
          m.set('open_gid_by_name:' + self.name, self.id);
        } else if (old_game.state == 'open' && self.state != 'open') {
          m.del('open_gid_by_name:' + self.name, self.id);
        }
        m.set('game_by_gid:'+self.id, JSON.stringify(extract(self, 
          self.properties)));
        m.exec(cb);
      });
      //WARNING: assume no game name change
    }
  },
  del: function(cb){
    var m = client.multi();
    m.del('game_by_gid:'+this.id);
    m.srem('all_games_state_'+this.state, this.id);
    if(this.state == 'open'){
      m.del('game_by_name:'+this.name);
    };
    m.exec(cb);
  },
}

var Games = {
  next_gid: function(cb){
    client.incr('global:nextGameId', cb);
  },
  by_id: function(gid, cb){
    client.get('game_by_gid:' + gid, function(err, data){
      console.log(data);
      cb(err, data?new Game(data):false);
    });
  },
  by_name: function(name, cb){
    client.get('open_gid_by_name:' + name, function(err, gid){
      if(err) cb(err, gid);
      else {
        Games.by_id(gid, cb);
      }
    });
  },
  name_exists: function(name, cb){
    client.exists('open_gid_by_name:'+name, cb);
  },
  by_ids: function(gids, cb){
    for (i in gids){
      gids[i] = 'game_by_gid:' + gids[i];
    }
    client.mget(gids, function(err, data){
      for(i in data){
        data[i] = new Game(data[i]);
      }
      cb(err, data);
    });
  },
  all_gids_in_state: function(state, cb){
    client.smembers('all_games_state_'+state, cb);
  }
}

//NO CHANGING GAME NAMES
db = {
  client: client,
  User: User,
  Users: Users,
  Game: Game,
  Games: Games
};

module.exports = db;
