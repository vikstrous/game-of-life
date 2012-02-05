var express = require('express')
  , stylus = require('stylus')
  , io = require('socket.io');

var app = express.createServer();

app.configure(function(){
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({secret: 'secret', key: 'express.sid'}));
  /*app.use(function (req, res) {
    res.end('<h2>Hello, your session id is ' + req.sessionID + '</h2>');
  });*/
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
  res.render('index');
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

var sio = io.listen(app);
 
sio.sockets.on('connection', function (socket) {
    console.log('A socket connected!');
});

var parseCookie = require('connect').utils.parseCookie;
 
sio.set('authorization', function (data, accept) {
    // check if there's a cookie header
    if (data.headers.cookie) {
      // if there is, parse the cookie
      data.cookie = parseCookie(data.headers.cookie);
      // note that you will need to use the same key to grad the
      // session id, as you specified in the Express setup.
      data.sessionID = data.cookie['express.sid'];
    } else {
       // if there isn't, turn down the connection with a message
       // and leave the function.
       return accept('No cookie transmitted.', false);
    }
    // accept the incoming connection
    accept(null, true);
});
