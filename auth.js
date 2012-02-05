
var everyauth = require('everyauth')
  
module.exports = {
  middleware: function() { return everyauth.middleware() },
  init: function(app, redis){
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
        var users = redis.lrange("users", 0, -1, function(err, users){
          if (err) return promise.fulfill([err]);
          if(users){
            for (u in users) {
              var user = JSON.parse(users[u]);
              if(user.email == email && user.password == password){
                promise.fulfill(user);
              }
            }
          }
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
        redis.lrange("users", 0, -1, function(err, users){
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
        redis.rpush("users", JSON.stringify(newUserAttributes));
        return newUserAttributes;
      })
      .registerSuccessRedirect('/'); // Where to redirect to after a successful registration
    everyauth.helpExpress(app);
  },
  login_check: function(req, res, next) {
    if(req.loggedIn){
      next();
    } else {
      console.log(req);
      res.redirect('/login');
    }
  }
}
