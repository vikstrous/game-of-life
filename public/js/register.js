$(function(){
  $("form").submit(function(){
    if ($('input[name="password"]').val() == $('input[name="password_again"]').val()){
      return true;
    } else {
      alert("Passwords don't match!");
      return false;
    }
  });
});
