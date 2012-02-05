var express = require('express')
  , stylus = require('stylus')
  , MemoryStore = express.session.MemoryStore
  , io = require('socket.io')
  , everyauth = require('everyauth')
  , RedisStore = require('connect-redis')(express);

var redis = require("redis"),
    client = redis.createClient(2772, "50.30.35.9");

client.on("error", function (err) {
    console.log("Redis error " + err);
});

client.auth("e8d00846616c5645c7b093c584b4b34b");
/*
client.set("string key", "string val", redis.print);
client.hset("hash key", "hashtest 1", "some value", redis.print);
client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
client.hkeys("hash key", function (err, replies) {
    console.log(replies.length + " replies:");
    replies.forEach(function (reply, i) {
        console.log("    " + i + ": " + reply);
    });
    client.quit();
});
*/

var app = express.createServer();
var sessionStore = new RedisStore({client:client});
var Session = require('connect').middleware.session.Session;



everyauth.password
  .loginWith('email')
  .getLoginPath('/login') // Uri path to the login page
  .postLoginPath('/login') // Uri path that your login form POSTs to
  .loginView('login')
  .authenticate( function (email, password) {
    // Either, we return a user or an array of errors if doing sync auth.
    // Or, we return a Promise that can fulfill to promise.fulfill(user) or promise.fulfill(errors)
    // `errors` is an array of error message strings
    //
    // e.g., 
    // Example 1 - Sync Example
    // if (usersByLogin[login] && usersByLogin[login].password === password) {
    //   return usersByLogin[login];
    // } else {
    //   return ['Login failed'];
    // }
    //
    // Example 2 - Async Example
    // var promise = this.Promise()
    // YourUserModel.find({ login: login}, function (err, user) {
    //   if (err) return promise.fulfill([err]);
    //   promise.fulfill(user);
    // }
    // return promise;
    var promise = this.Promise();
    var users = client.lrange("users", 0, -1, function(err, users){
      if (err) return promise.fulfill([err]);
      if(users){
        for (u in users) {
          var user = JSON.parse(users[u]);
          if(user.email == email && user.password == password){
            promise.fulfill(user);
          }
        }
      }
      console.log(users);
      promise.fulfill(['Wrong username or password.']);
    });
    return promise;
  })
  .loginSuccessRedirect('/game') // Where to redirect to after a login

    // If login fails, we render the errors via the login view template,
    // so just make sure your loginView() template incorporates an `errors` local.
    // See './example/views/login.jade'

  .getRegisterPath('/register') // Uri path to the registration page
  .postRegisterPath('/register') // The Uri path that your registration form POSTs to
  .registerView('register')
  .validateRegistration( function (newUserAttributes, baseErrors) {
    // Validate the registration input
    // Return undefined, null, or [] if validation succeeds
    // Return an array of error messages (or Promise promising this array)
    // if validation fails
    //
    // e.g., assuming you define validate with the following signature
    // var errors = validate(login, password, extraParams);
    // return errors;
    //
    // The `errors` you return show up as an `errors` local in your jade template
    
    // First, validate your errors. Here, validateUser is a made up function
    var promise = this.Promise();
    var err = [];
    client.lrange("users", 0, -1, function(err, users){
      if (err) return promise.fulfill([err]);
      var e = baseErrors;
      if(users){
        for (u in users){
          var user = JSON.parse(users[u]);
          if (user.email == newUserAttributes.email){
            e.push("An account with this email already exists.");
          }
        }
      }
      if(newUserAttributes.password.length < 5){
        e.push("Password too short.");
      }
      if(newUserAttributes.email.length == 0){
        e.push("Enter an email.");
      }
      promise.fulfill(e);
    });
    return promise;

    // Return the array of errors, so your view has access to them.
    return baseErrors;
  })
  .registerUser( function (newUserAttributes) {
    // This step is only executed if we pass the validateRegistration step without
    // any errors.
    //
    // Returns a user (or a Promise that promises a user) after adding it to
    // some user store.
    //
    // As an edge case, sometimes your database may make you aware of violation
    // of the unique login index, so if this error is sent back in an async
    // callback, then you can just return that error as a single element array
    // containing just that error message, and everyauth will automatically handle
    // that as a failed registration. Again, you will have access to this error via
    // the `errors` local in your register view jade template.
    // e.g.,
    // var promise = this.Promise();
    // User.create(newUserAttributes, function (err, user) {
    //   if (err) return promise.fulfill([err]);
    //   promise.fulfill(user);
    // });
    // return promise;
    //
    // Note: Index and db-driven validations are the only validations that occur 
    // here; all other validations occur in the `validateRegistration` step documented above.
    client.rpush("users", JSON.stringify(newUserAttributes));
    return newUserAttributes;
  })
  .registerSuccessRedirect('/'); // Where to redirect to after a successful registration



var routes = function(app){
  app.get('/', function(req, res) {
    res.render('index');
  });
  app.get('/game', function(req, res) {
    if(req.loggedIn){
      res.render('game');
    } else {
      res.redirect('/login');
    }
  });
}

app.configure(function(){
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore
      , secret: 'tj54u49tpowe548tuwp94t58u3w094ity897y8y'
      , key: 'express.sid'}));
  app.use(everyauth.middleware());
  app.use(express.router(routes));
  app.use(stylus.middleware(
    { src: __dirname + '/stylus',
      dest: __dirname + '/public'}
  ));
  app.use(express.static(__dirname + '/public'));
  
});

everyauth.helpExpress(app);

app.configure('development', function(){
  app.use(express.logger());
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


var game_server = require(__dirname + '/game_server/main.js')
sio.sockets.on('connection', game_server);
