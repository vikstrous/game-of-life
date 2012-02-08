var everyauth = require('everyauth')
  , db = require(__dirname + '/db.js');

module.exports = {
  middleware: function() { return everyauth.middleware() },
  init: function(app, db){
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
        db.user_by_email(email, function(err, user){
          if (err) return promise.fulfill([err]);
          if (user && user.password == password){
            promise.fulfill(user);
          }
          promise.fulfill(['Wrong username or password.']);
        });
        return promise;
      })
      .respondToLoginSucceed(function(res, user, data){
        if(user){//check for success
          var r = data.session.redirectTo;
          delete data.session.redirectTo;
          res.redirect(r || '/');
        }
      })
      .respondToRegistrationSucceed(function(res, user, data){
        if(user){ //check for success
          var r = data.session.redirectTo;
          delete data.session.redirectTo;
          res.redirect(r || '/');
        }
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
        if(newUserAttributes.email.length == 0){
          e.push("Enter an email.");
        }
        if (e.length > 0){
          promise.fulfill(e);
        } else {
          db.user_by_email_exists(newUserAttributes.email, function(err, exists){
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
        db.new_user(newUserAttributes, function(err, user){
          if(err) return promise.fulfill([err]);
          promise.fulfill(user);
        });
        return promise;
      });
      
      everyauth.helpExpress(app, {userAlias:'userr'});
      everyauth.everymodule.findUserById(function (userId, callback) {
        db.user_by_id(userId, callback);
      });
  },
  login_check: function(req, res, next) {
    if(req.loggedIn){
      next();
    } else {
      req.session.redirectTo = req.url
      res.redirect('/login');
    }
  }
}
