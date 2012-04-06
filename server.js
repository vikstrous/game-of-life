var express = require('express')
  , stylus = require('stylus')
  , io = require('socket.io')
  , RedisStore = require('connect-redis')(express)
  , db = require(__dirname + '/db.js')
  , Session = require('connect').middleware.session.Session
  , parseCookie = require('connect').utils.parseCookie
  , game_server = require(__dirname + '/game_server/main.js')
  , auth = require(__dirname + '/auth.js');
  
game_server.init();
var app = express.createServer();
auth.init(app);

var sessionStore = new RedisStore({client:db.client});

app.configure(function(){
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore
      , secret: 'tj54u49tpowe548tuwp94t58u3w094ity897y8y'
      , key: 'express.sid'}));
  app.use(express.bodyParser());
  //app.use(express.csrf()); //TODO: USE THIS!!
  app.use(auth.middleware());
  app.use(express.router(require(__dirname + '/router.js')));
  app.use(stylus.middleware(
    { src: __dirname + '/stylus',
      dest: __dirname + '/public'}
  ));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.logger());
});

var port = process.env.NODE_PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

var sio = io.listen(app);

sio.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        // save the session store to the data object 
        // (as required by the Session constructor)
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
            if (err || !session) {
                accept('Error', false);
            } else {
                // create a session object, passing data as request and our
                // just acquired session data
                data.session = new Session(data, session);
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
});

sio.sockets.on('connection', game_server.onconnect);
