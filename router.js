var login_check = require(__dirname + '/auth.js').login_check
  , db = require(__dirname + '/db.js');

module.exports = function(app){
  app.get('/', function(req, res) {
    res.render('index');
  });
  app.get('/join', login_check, function(req, res) {
    db.all_games(function(err, games){
      if(err) throw err;
      if(games){
        res.render('join', {games: games});
      } else {
        console.error("Games failed to fetch.");
      }
    });
  });
  app.get('/create', login_check, function(req, res) {
    res.render('create');
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
          db.new_game({name:req.body.name, players:[req.user.id], grid_size:{x:req.body.x,y:req.body.y}});
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
        //if there isn't already a second player, join
        if(game.players[1] === undefined){
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
