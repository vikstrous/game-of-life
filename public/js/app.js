var socket = io.connect();
var games_list = [];
var page_loading_counter = 0;

function page_is_loading(state) {
  if (state) {
    page_loading_counter += 1;
  } else {
    page_loading_counter -= 1;
  }
  if (page_loading_counter <= 0) {
    $('#overlay').hide();
  } else {
    $('#overlay').show();
  }
}

var App = {

  state: 'main_menu',

  init: function(){
    App.load_join_game(function() {
      App.show_main_menu();
    });
    App.attach_misc_actions();
  },

  show_main_menu: function(){
    $('#main-panel').show();
    $('#game-panel').hide();
    if (games_list.length == 0) {
      App.show_create_game();
    }
    App.no_top_status();
    App.no_top_error();
    App.render_join_game(games_list);
    App.state = 'main_menu';
  },

  show_game: function(){
    $('#main-panel').hide();
    $('#game-panel').show();
    App.no_top_status();
    App.no_top_error();
    App.state = 'show_game';
  },

  show_create_game: function(){
    $('#create').show();
    $('#create-btn').hide();
  },

  rematch: function(game){
    //takes the settings from the old game and makes a new game
    //in a rematch game there is a limited number of players who can join
    App.top_status("Waiting for other player to accept rematch.");
    socket.emit('rematch', game.id, function(data) {
      if(data.errors) App.top_error(data.errors[0]);
      else if (data.id){
        App.load_play_game(data.id);
      }
    });
  },

  create_game: function(name, x, y) {
    socket.emit('create', name, x, y, function(data){
      if(data.errors) {
        $('#create-error').text(data.errors[0]).show();
      } else if (data.status == 'ok') {
        $('#create-error').hide();
        App.load_play_game(data.id);
      }
    });
  },

  attach_misc_actions: function() {

    $('#create-btn').click(App.show_create_game);

    //attach actions
    $('#create-form').submit(function(e){
      e.preventDefault();
      var name = $('#create-form input[name="name"]').val();
      var x = $('#create-form input[name="x"]').val();
      var y = $('#create-form input[name="y"]').val();
      App.create_game(name, x, y);
    });
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
      App.load_play_game($(this).attr('gameid'));
    });
    page_is_loading(false);
  },

  load_join_game: function(cb){
    socket.emit('list_games', function(games) {
      games_list = games;
      if(typeof cb == 'function') cb();
      App.render_join_game(games);
    });
  },

  top_status: function(text){
    $('#top-status').text(text).show();
  },

  no_top_status: function(){
    $('#top-status').hide();
  },
  top_error: function(text){
    $('#top-error').text(text).show();
  },

  no_top_error: function(){
    $('#top-error').hide();
  },

  render_play_game: function(game){
    $('#game').mustachify('game', game);
    $('#back_to_menu').click(function(){
      App.show_main_menu();
      socket.emit('quit');
      //TODO: kill game on the client side somehow so it stops rendering things
    });
    App.show_game();
    Game.join_game(game);
  },

  load_play_game: function(id){
    page_is_loading(true);
    socket.emit('play', id, function(data){
      if(data.game){
        App.render_play_game(data.game);
      } else if (data.errors){
        App.top_error(data.errors[0]);
      }
      page_is_loading(false);
    });
  }
};

socket.on('new_game', function(game) {
  games_list.unshift(game);
  if(App.state == 'main_menu'){
    App.render_join_game(games_list);
  }
});

socket.on('remove_game', function(id) {
  for (var i in games_list){
    if (games_list[i].id == id){
      games_list.splice(i,1);
      if(App.state == 'main_menu'){
        App.render_join_game(games_list);
      }
    }
  }
});

$(function(){
  App.init();
});
