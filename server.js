var express = require('express')
  , stylus = require('stylus')
  , MemoryStore = express.session.MemoryStore
  , io = require('socket.io');

var app = express.createServer();
var sessionStore = new MemoryStore();
var Session = require('connect').middleware.session.Session;

app.configure(function(){
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore
      , secret: 'secret'
      , key: 'tj54u49tpowe548tuwp94t58u3w094ity897y8y'}));
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

var parseCookie = require('connect').utils.parseCookie;

sio.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['tj54u49tpowe548tuwp94t58u3w094ity897y8y'];
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

sio.sockets.on('connection', function (socket) {
  
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });

  var hs = socket.handshake;
  console.log('A socket with sessionID ' + hs.sessionID 
      + ' connected!');
  // setup an inteval that will keep our session fresh
  var intervalID = setInterval(function () {
      // reload the session (just in case something changed,
      // we don't want to override anything, but the age)
      // reloading will also ensure we keep an up2date copy
      // of the session with our connection.
      hs.session.reload( function () { 
          // "touch" it (resetting maxAge and lastAccess)
          // and save it back again.
          hs.session.touch().save();
      });
  }, 60 * 1000);
  
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
  
  socket.on('disconnect', function () {
      console.log('A socket with sessionID ' + hs.sessionID 
          + ' disconnected!');
      // clear the socket interval to stop refreshing the session
      clearInterval(intervalID);
  });
});
