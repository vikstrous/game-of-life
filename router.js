var auth = require(__dirname + '/auth.js')
  , login_check = auth.login_check
  , admin_only = auth.admin_only
  , db = require(__dirname + '/db.js');

module.exports = function(app){

  app.get('/', function(req, res) {
    res.render('index');
  });

  app.get('/join', login_check, function(req, res) {
    db.all_gids_in_state('open', function(err, gids){
      if(err) throw err;
      db.games_by_ids(gids, function(err, games){
        if(games){
          res.render('join', {games: games});
        } else {
          console.error("Games failed to fetch.");
        }
      });
    });
  });

  app.get('/test', admin_only, function(req, res) {
    res.render('test');
  });

  app.get('/create', login_check, function(req, res) {
    res.render('create');
  });

  app.get('/profile', login_check, function(req, res) {
    res.render('profile', {profile: req.user});
  });

  app.get('/profile/list', login_check, function(req, res) {
    if (req.user.isAdmin) {
      db.list_users(function(err, users) {
        if(err) throw err;
        res.render('profile_list', {profiles: users});
      });
    } else {
      res.redirect('/profile');
    }
  });

  app.get('/profile/edit', login_check, function(req, res){
    res.render('profile_edit', {profile: req.user});
  });

  app.get('/profile/:id', login_check, function(req, res) {
    db.user_by_id(req.params.id, function(err, user) {
      if (err) throw err;
      if (user) {
        res.render('profile', {profile: user});
      } else {
        res.redirect('/profile');
      }
    });
  });

  app.get('/profile/:id/edit', login_check, function(req, res) {
    db.user_by_id(req.params.id, function(err, user) {
      if (err) throw err;
      if (user) {
        if(req.user.id == user.id || req.user.isAdmin) {
          res.render('profile_edit', {profile: user});
        } else {
          res.redirect('/profile');
        }
      } else {
        res.redirect('/profile');
      }
    });
  });

  app.post('/create', login_check, function(req, res) {
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
      db.game_by_name(req.body.name, function(err, game){
        if(err) throw err;
        if(!game){
          db.new_game({name:req.body.name, state:'open', players:[req.user.id], grid_size:{x:req.body.x,y:req.body.y}, start_state:[null, null]});
          res.redirect('/game/'+req.body.name);
        } else {
          res.render('create', {error:['Game name already taken.']});
        }
      });
    } else {
      res.render('create', {error:err});
    }
  });

  app.get('/game/:name', login_check, function(req, res) {
    db.game_by_name(req.params.name, function(err, game) {
      if(game) {
        //if you are player one, do nothing
        if (game.players[0] === req.user.id){
          res.render('game', {game: game});
        } else if (game.players[1] === undefined){ //if there isn't already a second player, join
          game.players[1] = req.user.id;
          db.update_game(game.id, game, function(err){
            if(err) throw err;
            res.render('game', {game:game});
          });
        } else if (game.players[1] === req.user.id){
          res.render('game', {game: game});
        } else {
          //TODO: allow watchers
          res.redirect('/');
        }
      } else {
        res.redirect('/create');
      }
    });
  });
};
