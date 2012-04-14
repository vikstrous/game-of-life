var socket = io.connect();
var games_list = [];

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
      alert("you have to log in!");
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

var app = {

  state: 'main_menu',

  init: function(){
    app.load_join_game();
    app.load_create_game();
    app.show_main_menu();
  },

  show_main_menu: function(){
    $('#join').show();
    $('#create').show();
    $('#header').hide();
    $('#game').hide();
    app.no_top_error();
    app.state = 'main_menu';
  },

  show_game: function(){
    $('#join').hide();
    $('#create').hide();
    $('#header').show();
    $('#game').show();
    app.no_top_error();
    app.state = 'show_game';
  },

  //render list of games to join
  render_join_game: function(games){
    page_is_loading(true);
    $('#join').mustachify('join', {games: games});
    //attach actions
    $('#show_bots').change(function() {
      console.log($(this).is(':checked'));
    });
    $('.game>a').click(function(){
      app.load_play_game($(this).attr('name'));
    });
    page_is_loading(false);
  },

  load_join_game: function(){
    get('join', function(games) {
      games_list = games;
      app.render_join_game(games);
    });
  },

  top_error: function(text){
    $('#top-error').text(text).show();
  },

  no_top_error: function(){
    $('#top-error').hide();
  },

  load_play_game: function(name){
    page_is_loading(true);
    socket.emit('join', name, function(data){
      if(data.game){
        $('#game').mustachify('game', data.game);
        $('#back_to_menu').click(function(){
          app.show_main_menu();
          socket.emit('quit');
          //TODO: kill game on the client side somehow so it stops rendering things
        });
        app.show_game();
        join_game(data.game);
        page_is_loading(false);
      } else if (data.errors){
        app.top_error(data.errors[0]);
        page_is_loading(false);
      }
    });
  },

  load_create_game: function(){
    //render create game form
    $('#create').mustachify('create');
    //attach actions
    $('#create-form').submit(function(e){
      e.preventDefault();
      var name = $('#create-form input[name="name"]').val();
      var x = $('#create-form input[name="x"]').val();
      var y = $('#create-form input[name="y"]').val();
      socket.emit('create', name, x, y, function(data){
        if(data.errors) {
          $('#create-error').text(data.errors[0]).show();
        } else if (data.status == 'ok') {
          $('#create-error').hide();
          app.load_play_game(data.name);
        }
      });
    });
  }
};

socket.on('new_game', function(game) {
  games_list.unshift(game);
  if(app.state == 'main_menu'){
    app.render_join_game(games_list);
  }
});
socket.on('remove_game', function(name) {
  for (var i in games_list){
    if (games_list[i].name == name){
      games_list.splice(i,1);
      if(app.state == 'main_menu'){
        app.render_join_game(games_list);
      }
    }
  }
});

$(function(){
  app.init();
});
