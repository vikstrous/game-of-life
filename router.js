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
    db.new_game({name:req.body.name});
    res.redirect('/game/'+req.body.name);
  });
  app.get('/game/:name', login_check, function(req, res) {
    res.render('game', {game_name: req.params.name});
  });
};
