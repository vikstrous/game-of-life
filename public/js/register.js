$(function(){
  $("#register").submit(function(){
    if ($('#register input[name="password"]').val() == $('#register input[name="password_again"]').val()){
      return true;
    } else {
      alert("Passwords don't match!");
      return false;
    }
  });
});
