var auth = require(__dirname + '/auth.js')
  , login_check = auth.login_check
  , ajax_login_check = auth.ajax_login_check
  , admin_only = auth.admin_only
  , is_admin = auth.is_admin
  , db = require(__dirname + '/db.js');

function render(req, res, path, vars){
  //if mobile
  if (/mobile/i.test(req.header('user-agent'))){
    if(vars === undefined)
      vars = {};
    vars.layout = 'mobile/layout-mobi';
    res.render(path, vars);
  }
  else {
    res.render(path, vars);
  }
};

module.exports = function(app){

  app.get('/', function(req, res) {
    render(req, res, 'index');
  });

  app.get('/join', function(req, res) {
    db.Games.all_gids_in_state('open', function(err, gids){
      if(err) throw err;
      db.Games.by_ids(gids, function(err, games){
        var g_list = [];
        for (g in games){
          var game = games[g];
          g_list.push({name:game.name, grid_size:game.grid_size}); //TODO: get the (user)name of the creator of the game in here
        }
        res.json(g_list);
      });
    });
  });

  app.get('/test', admin_only, function(req, res) {
    render(req, res, 'test');
  });

  app.get('/admin', admin_only, function(req, res) {
    db.Games.all_gids_in_state('open', function(err, gids){
      if(err) throw err;
      db.Games.by_ids(gids, function(err, games){
        render(req, res, 'admin', {games: games});
      });
    });
  });

  app.post('/admin/games/delete', admin_only, function(req, res) {
    db.Games.by_id(req.body.gid, function(err, game){
      if(err) throw err;
      game.del(function(){
        res.redirect('back');
      });
    });
  });

  app.get('/profile', login_check, function(req, res) {
    render(req, res, 'profile', {profile: req.user});
  });

  app.get('/profile/list', admin_only, function(req, res) {
    db.Users.list(function(err, users) {
      if(err) throw err;
      render(req, res, 'profile_list', {profiles: users});
    });
  });

  app.get('/profile/edit', login_check, function(req, res){
    render(req, res, 'profile_edit', {profile: req.user});
  });

  app.get('/profile/:id', login_check, function(req, res) {
    db.Users.by_id(req.params.id, function(err, user) {
      if (err) throw err;
      if (user) {
        render(req, res, 'profile', {profile: user});
      } else {
        res.redirect('/profile');
      }
    });
  });

  app.get('/profile/:id/edit', login_check, function(req, res) {
    db.Users.by_id(req.params.id, function(err, user) {
      if (err) throw err;
      if (user) {
        if(req.user.id == user.id || is_admin(req.user)) {
          render(req, res, 'profile_edit', {profile: user});
        } else {
          res.redirect('/profile');
        }
      } else {
        res.redirect('/profile');
      }
    });
  });

  app.post('/create', ajax_login_check, function(req, res) {
    var err = [];
    if(!req.body.x || !req.body.y){
      err.push("Please enter dimensions for the game.");
    }
    if(!req.body.name || req.body.name.length == 0){
      err.push("Please enter a name for the game.");
    }
    if(req.body.x < 20 || req.body.y < 20){
      err.push("Minimum size: 20");
    }
    if(req.body.x > 200 || req.body.y > 200){
      err.push("Maximum size: 200");
    }
    if(err.length == 0){
      //TODO: validate name (no weird characters! alphanum)
      db.Games.name_exists(req.body.name, function(err, exists){
        if(err) throw err;
        if(!exists){
          var game = new db.Game({name:req.body.name, 
            state:'open', 
            players:[req.user.id], 
            grid_size:{x:req.body.x,y:req.body.y}, 
            start_state:[null, null],
            sockets:[null,null]});
          game.save(function(err){
            if(err) throw err;
            res.json({name:req.body.name, status:'ok'});
          });
        } else {
          res.json({errors:['Game name already taken.']});
        }
      });
    } else {
      res.json({errors:err});
    }
  });

  app.get('/game/:name', login_check, function(req, res) {
    db.Games.by_name(req.params.name, function(err, game) {
      if(err) throw err;
      if(game) {
        //if you are player 1, do nothing
        if (game.players[0] === req.user.id){
          render(req, res, 'game', {game: game});
        //if you are player 2, do nothing
        } else if (game.players[1] === req.user.id){
          render(req, res, 'game', {game: game});
        //if you are joining, join
        } else if (game.players[1] === undefined){ //if there isn't already a second player, join
          game.players[1] = req.user.id;
          game.state = "waiting1";
          game.save(function(err){
            if(err) throw err;
            render(req, res, 'game', {game:game});
          });
        } else {
          res.redirect('/');
        }
      } else {
        res.redirect('/create');
      }
    });
  });
};
