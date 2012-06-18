var express = require('express'),
    stylus = require('stylus'),
   io = require('socket.io'),
   RedisStore = require('connect-redis')(express),
   db = require(__dirname + '/db.js'),
   connect = require('connect'),
   cookie = require('cookie'),
   game_server = require(__dirname + '/game_server/main.js'),
   auth = require(__dirname + '/auth.js');

var Session = connect.middleware.session.Session;
var app = express.createServer();
auth.init(app);

var secret = 'tj54u49tpowe548tuwp94t58u3w094ity897y8y';
var sessionStore = new RedisStore({client:db.client});

app.configure(function(){
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore,
        secret: secret,
        key: 'express.sid'}));
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
  /* NOTE: To detect which session this socket is associated with,
  * we need to parse the cookies. */
  if (!data.headers.cookie) {
    return accept('Session cookie required.', false);
  }
  /* XXX: Here be hacks! Both of these methods are part of Connect's
  * private API, meaning there's no guarantee they won't change
  * even on minor revision changes. Be careful (but still
  * use this code!) */
  /* NOTE: First parse the cookies into a half-formed object. */
  console.log(data.headers.cookie);
  data.cookie = cookie.parse(data.headers.cookie);
  console.log(data.cookie);
  /* NOTE: Next, verify the signature of the session cookie. */
  if(secret) {
    data.cookie = connect.utils.parseSignedCookies(data.cookie, secret);
    console.log(data.cookie);
  }
  // data.cookie = utils.parseJSONCookies(data.cookie);

  /* NOTE: save ourselves a copy of the sessionID. */
  data.sessionID = data.cookie['express.sid'];
  console.log(data.sessionID, 'sid');
  /* NOTE: get the associated session for this ID. If it doesn't exist,
  * then bail. */
  // data.sessionStore = sessionStore;
  sessionStore.get(data.sessionID, function (err, session) {
    if (err) {
      return accept('Error in session store.', false);
    } else if (!session) {
      return accept('Session not found.', false);
    }
    // create a session object, passing data as request and our
    // just acquired session data
    data.session = session;
    return accept(null, true);
  });
});

game_server.init(sio);
sio.sockets.on('connection', game_server.onconnect);
