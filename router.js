var login_check = require(__dirname + '/auth.js').login_check;

module.exports = function(app){
  app.get('/', function(req, res) {
    res.render('index');
  });
  app.get('/join', login_check, function(req, res) {
    res.render('join');
  });
  app.get('/create', login_check, function(req, res) {
    res.render('create');
  });
  app.get('/game', login_check, function(req, res) {
    res.render('game');
  });
};
