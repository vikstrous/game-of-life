var login_check = require(__dirname + '/auth.js').login_check
  , db_client = require(__dirname + '/db.js').client;

module.exports = function(app){
  app.get('/', function(req, res) {
    res.render('index');
  });
  app.get('/join', login_check, function(req, res) {
    db_client.lrange("games", 0, -1, function(err, games){
      if(err) throw err;
      if(games){
        var games_decoded = [];
        for (g in games) {
          games_decoded.push(JSON.parse(games[g]));
        }
        res.render('join', {games: games_decoded});
      } else {
        console.error("No games exist.");
      }
    });
  });
  app.get('/create', login_check, function(req, res) {
    res.render('create');
  });
  app.post('/create', login_check, function(req, res) {
    redis.rpush("games", JSON.stringify({name:req.data.name}));
  });
  app.get('/game', login_check, function(req, res) {
    res.render('game');
  });
};
