function page_is_loading(state){
  if(state){
    $('#overlay').show();
  } else {
    $('#overlay').hide();
  }
}

function get(){
  var args = [].slice.call(arguments);
  ajax('get', args);
}
function post(){
  var args = [].slice.call(arguments);
  ajax('post', args);
}
function ajax(method, args){
  page_is_loading(true);
  var cb;
  if(typeof args[args.length-1] == 'function'){
    cb = args.pop();
  }
  args.push(function(data){
    if(data.require_login) {
      console.log("you have to log in!");
    } else if(typeof cb == 'function') {
      cb.apply(this, arguments);
    }
    page_is_loading(false);
  });
  //TODO: add error handlers and use the .ajax call
  $[method].apply(window, args).error(function(){
    console.log('ajax error');
    console.log(arguments);
  });
}

$(function(){
  //render list of games to join
  get('join', function(games) {
    $('#join').html($.mustache('join', {games: games}));
    //attach actions
    $('#show_bots').change(function() {
      console.log($(this).is(':checked'));
    });
  });
  //render create game form
  $('#create').html($.mustache('create'));
  //attach actions
  $('#create-form').submit(function(e){
    e.preventDefault();
    post('create', $(this).serialize(), function(data){
      console.log(arguments);
      if(data.errors) {
        $('#create-error').text(data.errors[0]).show();
      } else if (data.status = 'ok') {
        $('#create-error').hide();
        document.location = '/game/'+data.name;
      }
    });
  });
});
