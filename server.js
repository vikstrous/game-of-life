var express = require('express')
  , stylus = require('stylus')
  , MemoryStore = express.session.MemoryStore
  , io = require('socket.io')
  , everyauth = require('everyauth');

var app = express.createServer();
var sessionStore = new MemoryStore();
var Session = require('connect').middleware.session.Session;

var users = [];

function validateUser(attributes){
  var err = [];
  if(attributes.password.length < 5){
    err.push("Password too short.");
  }
  if(attributes.email.length == 0){
    err.push("Enter an email.");
  }
  return err;
}

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
    for (u in users) {
      if(users[u].email == email && users[u].password == password){
        return u;
      }
    }
    return ['Wrong username or password.'];
  })
  .loginSuccessRedirect('/') // Where to redirect to after a login

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
    var moreErrors = validateUser( newUserAttributes );
    if (moreErrors.length) baseErrors.push.apply(baseErrors, moreErrors);

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
    users.push(newUserAttributes);
    return newUserAttributes;
  })
  .registerSuccessRedirect('/'); // Where to redirect to after a successful registration



var routes = function(app){  
  app.get('/', function(req, res) {
    res.render('index');
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
