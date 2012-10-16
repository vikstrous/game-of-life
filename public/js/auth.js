$(function(){
	$('#persona_login').click(function() { navigator.id.request(); });
	$('#persona_logout').click(function() { navigator.id.logout(); });
  $('#login_form').submit(function(e) { 
    e.preventDefault();
    $.post('/login', $('#login_form').serialize(), function(data){
      if(data.status == 'okay')
        console.log('logged in');
      if(data.status == 'error')
        console.log(data.error)
    });
  });
  $('#register_form').submit(function(e) {
    e.preventDefault();
    $.post('/register', $('#register_form').serialize(), function(data){
      if(data.status == 'okay')
        console.log('registered');
      if(data.status == 'error')
        console.log(data.error)
    });
  });


  var email = null;
  var user = $('meta[name=user]').attr('content');
  if(typeof user !== 'undefined'){
    email = JSON.parse(user).email;
  }
  navigator.id.watch({
    loggedInUser: email,
    onlogin: function(assertion) {
      // A user has logged in! Here you need to:
      // 1. Send the assertion to your backend for verification and to create a session.
      // 2. Update your UI.
      $.ajax({ /* <-- This example uses jQuery, but you can use whatever you'd like */
        type: 'POST',
        url: '/browser_id/login', // This is a URL on your website.
        data: {assertion: assertion},
        success: function(res, status, xhr) { window.location.reload(); },
        error: function(xhr, status, err) { alert(err); }
      });
    },
    onlogout: function() {
      // A user has logged out! Here you need to:
      // Tear down the user's session by redirecting the user or making a call to your backend.
      // Also, make sure loggedInUser will get set to null on the next page load.
      // (That's a literal JavaScript null. Not false, 0, or undefined. null.)
      $.ajax({
        type: 'GET',
        url: '/logout', // This is a URL on your website.
        success: function(res, status, xhr) { window.location.reload(); },
        error: function(xhr, status, err) { alert(err); }
      });
    }
  });
});