var express = require('express')
  , stylus = require('stylus');

var app = express.createServer();

app.configure(function(){
  app.set('view engine', 'jade');
  
  app.use(express.cookieParser());
  app.use(stylus.middleware(
    { src: __dirname + '/stylus',
      dest: __dirname + '/public'}
  ));
  app.use(express.static(__dirname + '/public'));

});

app.configure('development', function(){
  app.use(express.logger());
});

app.get('/', function(req, res) {
  var data = { show_tut: req.cookies.hide_tut !== 'yes' };
  res.render('index', data);
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
