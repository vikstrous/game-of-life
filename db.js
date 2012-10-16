var redis = require("redis");
var client;


if (process.env.NODE_REDIS === 'local') {
  client = redis.createClient();
} else {
  client = redis.createClient(2772, "50.30.35.9");
  client.auth("e8d00846616c5645c7b093c584b4b34b");
}

client.on("error", function(err) {
  console.log("Redis error " + err);
});

function init_numeric_fields(obj, fields) {
  if (typeof obj === 'string') {
    obj = JSON.parse(obj);
  }
  for (var f in fields) {
    if (obj[fields[f]] === undefined) obj[fields[f]] = 0;
  }
  return obj;
}

function init_list_fields(obj, fields) {
  if (typeof obj === 'string') {
    obj = JSON.parse(obj);
  }
  for (var f in fields) {
    if (obj[fields[f]] === undefined) obj[fields[f]] = [];
  }
  return obj;
}

function extract(obj1, properties, obj2) {
  if (!obj1) {
    obj1 = {};
  }
  if (typeof obj1 === 'string') {
    obj1 = JSON.parse(obj1);
  }
  if (typeof obj2 !== 'object' || obj2 === null) {
    obj2 = {};
  }
  for (var p in properties) {
    obj2[properties[p]] = obj1[properties[p]];
  }
  return obj2;
}

//user = {id, email, password}
var User = function(data) {
    data = init_list_fields(data, ['wins', 'losses', 'ties']);
    extract(data, this.properties, this);
  };

User.prototype = {
  properties: ['id', 'email', 'password', 'browser_id_audience', 
    'browser_id_session_expire', 'browser_id_issuer', 'account_type', 
    'wins', 'losses', 'ties', 'isAdmin'],
  save: function(cb) {
    //new
    var self = this;
    if (this.id === undefined) {
      Users.next_uid(function(err, uid) {
        if (err) throw err;
        console.log(uid);
        self.id = uid;
        client.mset('user_by_uid:' + uid, JSON.stringify(extract(self, self.properties)), 'uid_by_email:' + self.email, uid, cb);
      });
      //existing
    } else {
      client.get('user_by_uid:' + this.id, function(err, old_user) {
        if (err) throw err;
        var m = client.multi();
        if (old_user.email != self.email) {
          m.del('uid_by_email:' + old_user.email);
          m.set('uid_by_email:' + self.email, self.id);
        }
        m.set('user_by_uid:' + self.id, JSON.stringify(extract(self, self.properties)));
        m.exec(cb);
      });
    }
  },
  win: function(gid, cb) {
    this.wins.push(gid);
    this.save(cb);
  },
  lose: function(gid, cb) {
    this.losses.push(gid);
    this.save(cb);
  },
  tie: function(gid, cb) {
    this.ties.push(gid);
    this.save(cb);
  }
};

var Users = {
  next_uid: function(cb) {
    client.incr('global:nextUserId', cb);
  },
  by_email_exists: function(email, cb) {
    client.exists('uid_by_email:' + email, cb);
  },
  by_email: function(email, cb) {
    client.get('uid_by_email:' + email, function(err, uid) {
      if (err) cb(err, uid);
      else {
        Users.by_id(uid, cb);
      }
    });
  },
  by_id: function(uid, cb) {
    client.get('user_by_uid:' + uid, function(err, data) {
      cb(err, data ? new User(data) : false);
    });
  },
  //TODO: improve this?
  list: function(cb) {
    client.keys("user_by_uid:*", function(err, keys) {
      client.mget(keys, function(err, users) {
        for (var i in users) {
          users[i] = new User(users[i]);
        }
        cb(err, users);
      });
    });
  }
};

var GameRecord = function(data) {
    extract(data, this.properties, this);
  };

GameRecord.prototype = {
    properties: ['id', 'name', 'start_state', 'grid_size', 'players'/*, 'rematch_id'*/],

    save: function(cb) {
      var self = this;
      //new
      if (this.id === undefined) {
        GameRecords.next_id(function(err, gid) {
          if (err) throw err;
          self.id = gid;
          client.set('game_by_id:' + self.id, JSON.stringify(extract(self, self.properties)), cb);
        });
        //update
      } else {
        client.set('game_by_id:' + self.id, JSON.stringify(extract(self, self.properties)), cb);
        //WARNING: assume no game name change
      }
    },
    del: function(cb) {
      var m = client.del('game_by_id:' + this.id, cb);
    }

  };

var GameRecords = {
  by_id: function(gid, cb) {
    client.get('game_record_by_id:' + gid, function(err, data) {
      cb(err, data ? new GameRecord(data) : false);
    });
  },
  //memory id - the id used while stored in memory
  next_id: function(cb) {
    client.incr('global:nextGameId', cb);
  }
};

//state: open, waiting1, waiting2, processing, archived
var Game = function(data) {
    extract(data, this.properties, this);
  };


//TODO: eliminate need for properties list using getters and setters?
Game.prototype = {
  //ad is the id in the open_games array (aka its advertisement)
  properties: ['id', 'name', 'state', 'start_state', 'grid_size', 'players', 'sockets', 'rematch_id'],

  //add to the list of open games
  open_ad: function(creator) {
    var data = {
      id: this.id,
      name: this.name,
      grid_size: this.grid_size,
      creator_id: creator.id,
      creator_name: creator.name
      };
    this.ad = new GameAd(data);
    return this.ad.publish();
  },
  //remove from the list of open games
  close_ad: function() {
    if (this.ad) this.ad.close();
    delete this.ad;
  },
  //the max (non floating) number is 9e15 http://www.hunlock.com/blogs/The_Complete_Javascript_Number_Reference
  //so we have wrapping and renumbering at 9*10^15 or as soon as no games exist
  //9000000000000000
  //save to memory
  save: function() {
    // new
    if (this.id === undefined) {
      this.id = Games.next_id;
      //TODO: wrap at 9*10^15
      Games.next_id++;
    }
    // save
    Games._store[this.id] = this;
  },
  //relete from memory
  del: function() {
    this.close_ad(); //safety first, frosh!
    delete Games._store[this.id];
  },
  archive: function(cb) {
    var gr = new GameRecord(this);
    gr.save(cb);
  }
};

//this is sort of like an array
var Games = {
  _store: {},
  next_id: 0,
  by_id: function(id){
    return Games._store[id];
  }
};

var GameAd = function(data){
    extract(data, this.properties, this);
  };

GameAd.prototype = {
    //the id is the Game id
    properties: ['id', 'name', 'grid_size', 'creator_id', 'creator_name'],
    publish: function() {
      if (!GameAds.is_name_available(this.name)) {
        return false;
      }
      GameAds._store[this.name] = this;
      return true;
    },
    close: function(){
      delete GameAds._store[this.name];
    }
  };

//TODO: make all kinds of sorting/grouping types
var GameAds = {
  //maps names to ads
  _store: {},
  is_name_available: function(name){
    return GameAds._store[this.name] === undefined;
  },
  //TODO: precompute the list? or maybe just cache the result at the socket call level?
  open_games: function(){
    var list = [];
    for (var name in GameAds._store){
      list.push(GameAds._store[name]);
    }
    return list;
  },
  name_exists: function(name) {
    return GameAds._store[name] !== undefined;
  }
};

//NO CHANGING GAME NAMES
var db = {
  client: client,
  User: User,
  Users: Users,
  Game: Game,
  Games: Games,
  GameAd: GameAd,
  GameAds: GameAds,
  GameRecord: GameRecord,
  GameRecords: GameRecords
};

module.exports = db;
