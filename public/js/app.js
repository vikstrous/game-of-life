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
  var cb = args.pop();
  args.push(function(){
    cb.apply(this, arguments);
    page_is_loading(false);
  });
  //TODO: add error handlers and use the .ajax call
  $[method].apply(window, args);
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
      if(data.errors) {
        $('#create-error').text(data.errors[0]).show();
      } else {
        $('#create-error').hide();
        document.location = '/game/'+data.name;
      }
    });
  });
});