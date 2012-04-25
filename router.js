var auth = require(__dirname + '/auth.js'),
    login_check = auth.login_check,
    admin_only = auth.admin_only,
    is_admin = auth.is_admin,
    db = require(__dirname + '/db.js');

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
}

module.exports = function(app){

  app.get('/', function(req, res) {
    render(req, res, 'index');
  });

  app.get('/test', admin_only, function(req, res) {
    render(req, res, 'test');
  });
/*
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
  });*/

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
};
