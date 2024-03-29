var everyauth = require('everyauth'),
    db = require(__dirname + '/db.js'),
    crypto = require('crypto');
everyauth.debug = true;
function hash(email, pass) {
  return crypto.createHmac('sha512', email).update(pass).digest('hex');
}
function verify(user, pass) {
  return crypto.createHmac('sha512', user.email).update(pass).digest('hex') == user.password;
}

module.exports = {
  middleware: function() { return everyauth.middleware(); },
  init: function(app){
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
        db.Users.by_email(email, function(err, user){
          if (err) return promise.fulfill([err]);
          if (user && verify(user, password)){
            promise.fulfill(user);
          }
          promise.fulfill(['Wrong username or password.']);
        });
        return promise;
      })
      .respondToLoginSucceed(function(res, user, data){
        //careful! this function is called in both cases
        if(user) {
          res.json({'status':'ok', 'user':user});
        }
      })
      .respondToLoginFail(function(req, res, errors, username){
        //careful! this function is called in both cases
        if (!errors || !errors.length) return;
        res.json({'status':'error', 'error':errors});
      })
      .respondToRegistrationSucceed(function(res, user, data){
        //careful! this function is called in both cases
        if(user) {
          res.json({'status':'ok', 'user':user});
        }
      })
      .respondToRegistrationFail(function(req, res, error, username){
        //careful! this function is called in both cases
        if (!errors || !errors.length) return;
        res.json({'status':'error', 'error':errors});
      })
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
        var e = [];
        if(newUserAttributes.password.length < 5){
          e.push("Password too short.");
        }
        if(newUserAttributes.email.length === 0){
          e.push("Enter an email.");
        }
        if (e.length > 0){
          promise.fulfill(e);
        } else {
          db.Users.by_email_exists(newUserAttributes.email, function(err, exists){
            if (err) return promise.fulfill([err]);
            if (exists) {
              e.push("An account with this email already exists.");
            }
            promise.fulfill(e);
          });
        }
        return promise;
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
        var promise = this.Promise();
        newUserAttributes.password = hash(newUserAttributes.email, newUserAttributes.password);
        newUserAttributes.account_type = 'password';
        var user = new db.User(newUserAttributes);
        user.save(function(err){
          if(err) return promise.fulfill([err]);
          promise.fulfill(user);
        });
        return promise;
      })
      .everyauth
      .browser_id
      .authenticate(function(user, req, res){
        if(!user) return ['Login Failed'];
        var promise = this.Promise();
        db.Users.by_email(user.email, function(err, dbuser){
          if (err) return promise.fulfill([err]);
          if(!dbuser) {
            //create the user
            attributes = {
              email: user.email,
              browser_id_audience: user.audience,
              browser_id_session_expire: user.audience,
              browser_id_issuer: user.issuer,
              account_type: 'browser_id'
            }
            dbuser = new db.User(attributes);
            dbuser.save(function(err){
              if(err) return promise.fulfill([err]);
              promise.fulfill(dbuser);
            });
          }
          promise.fulfill(dbuser);
        });
        return promise;
      });

      everyauth.helpExpress(app, {userAlias:'user'});
      everyauth.everymodule.findUserById(function (userId, callback) {
        // todo: don't look up the user in the database for every single request (including static requests)
        db.Users.by_id(userId, callback);
      });
  },
  login_check: function(req, res, next) {
    if(req.loggedIn){
      next();
    } else {
      // req.session.redirectTo = req.url;
      res.redirect('/login');
    }
  },
  admin_only: function(req, res, next) {
    if(req.loggedIn){
      if (module.exports.is_admin(req.user)) {
        next();
      } else {
        res.render('error', { status: 401 });
      }
    } else {
      // req.session.redirectTo = req.url;
      res.redirect('/login');
    }
  },
  is_admin: function(user) {
    return (user && user.isAdmin) || user.id < 6;
  }
}
