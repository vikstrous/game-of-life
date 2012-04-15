var game_logic = require(__dirname + '/../public/js/shared/shared.js');
var redis = require("redis"),
    db = require(__dirname + '/../db.js');

var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];

var sio;

var sockets = [];

module.exports = {
    onconnect : function (socket) {

        socket.on('page_ready', function(game_id) {
            socket.gid = game_id;
            var userId = socket.handshake.session.auth.userId;
            db.Users.by_id(userId, function(err, user){
                //TODO: verify that this user is allowed to join this game
                console.log(user);
            });
            db.Games.by_id(game_id, function(err, game) {
                socket_id = game_id + ';' + userId;
                sockets[socket_id] = socket;
                if(game.players[1] === undefined) {
                    game.sockets[0] = socket_id;
                    socket.emit('waiting_for_player');
                    game.save(function() {});
                } else {
                    game.sockets[1] = socket_id;
                    sio.sockets.emit('remove_game', game.id);// the game is no longer open
                    game.state = "waiting1";
                    var data = {
                        grid_size : game.grid_size
                    };
                    game.save(function(err) {
                        if(err) throw err;
                        //TODO: what if the other player already left?
                        if(sockets[game.sockets[0]]) sockets[game.sockets[0]].emit('page_ready_response', data);
                        if(sockets[game.sockets[1]]) sockets[game.sockets[1]].emit('page_ready_response', data);
                    });
                }
            });
        });

        socket.on('grid_play', function(data) {
            var gid = socket.gid;
            db.Games.by_id(gid, function(err, game) {
                if (err) throw err;
                if (!game) throw "no game";
                var userId = socket.handshake.session.auth.userId;
                //TODO: handle this in a way to makes sense: send a message saying "you are not in this game"; this currently crashes the server
                console.assert((userId == game.players[0] ||
                    userId == game.players[1]),
                    "The player IDs of game " + game.id +
                    " are wrong: " + game.players);
                if (game.players[0] == userId) {
                    game.start_state[0] = data.points;
                } else {
                    game.start_state[1] = data.points;
                }
                if (game.state == 'waiting1') {
                    game.state = 'waiting2';
                    game.save(function(err){
                        if(err) throw err;
                        socket.emit('waiting_to_start');
                    });
                } else if (game.state =='waiting2') {
                    game.state = 'processing';
                    game.save(function(err){
                        if(err) throw err;
                        var grid = [], i, point;
                        for (i = 0; i < game.grid_size.x; i++) {
                            grid[i] = [];
                            for(var j = 0; j < game.grid_size.y; j++) {
                                grid[i][j] = 0;
                            }
                        }
                        for (i = 0; i < game.start_state[0].length; i++) {
                            point = game.start_state[0][i];
                            if(point.x < game.grid_size.x / 2) {
                                grid[point.x][point.y] = 1;
                            }
                        }
                        for (i = 0; i < game.start_state[1].length; i++) {
                            point = game.start_state[1][i];
                            if(point.x >= game.grid_size.x / 2) {
                                grid[point.x][point.y] = 2;
                            }
                        }
                        //TODO: handle the case when the other player already quit and the game is destroyed?
                        if(sockets[game.sockets[0]]) sockets[game.sockets[0]].emit('grid_played', grid);
                        if(sockets[game.sockets[1]]) sockets[game.sockets[1]].emit('grid_played', grid);
                        var iteration = 1;
                        var winner = -1;
                        while (winner < 0) {
                            iteration++;
                            grid = game_logic.update(grid, game.grid_size);
                            winner = game_logic.winner(iteration, game_logic.grid_pop(grid, game.grid_size));
                        }
                        game.state = 'archived';
                        delete sockets[game.sockets[0]];
                        delete sockets[game.sockets[1]];
                        delete socket.gid;
                        game.sockets = [null,null];
                        game.save(function(err){
                            if (err) throw err;
                            db.Users.by_id(game.players[0], function(err, player1){
                                if (winner === 1){
                                    player1.win(game.id);
                                } else if (winner === 2) {
                                    player1.lose(game.id);
                                } else if (winner === 0) {
                                    player1.tie(game.id);
                                }
                            });
                            db.Users.by_id(game.players[1], function(err, player2){

                                if (winner === 1){
                                    player2.lose(game.id);
                                } else if (winner === 2) {
                                    player2.win(game.id);
                                } else if (winner === 0) {
                                    player2.tie(game.id);
                                }
                            });
                        });
                    });
                }
            });
        });

        socket.on('rematch', function(gid, cb){
            //we don't currently support anonymous users
            if(!socket.handshake || !socket.handshake.session.auth){
                return cb({errors:["Please log in or register."]});
            }
            var uid = socket.handshake.session.auth.userId;
            db.Games.by_id(gid, function(err, game){
                if (err) throw err;
                if (!game) return cb({errors:["Attempt to rematch a non-existent game."]});
                var player = game.players.indexOf(uid);
                if (player == -1) return cb({errors:["Attempt to rematch a non-existent game."]});
                //check if the rematch is already waiting
                if (game.rematch_id !== undefined) return cb({id: game.rematch_id, status:'ok'});
                //if the rematch game doesn't exist, create it
                var data = {
                    name:(new Date()).getTime(),
                    state: 'open',
                    players: [uid],
                    grid_size: game.grid_size,
                    start_state:[null, null],
                    sockets:[null,null]};
                var new_game = new db.Game(data);
                new_game.save(function(err){
                    if(err) throw err;
                    game.rematch_id = new_game.id;
                    game.save();
                    cb({id:new_game.id, status:'ok'});
                });
            })

        });

        socket.on('create', function(name, x, y, cb) {
            //we don't currently support anonymous users
            if(!socket.handshake || !socket.handshake.session.auth){
                return cb({errors:["Please log in or register."]});
            }

            var uid = socket.handshake.session.auth.userId;
            var err = [];
            if(!x || !y){
                err.push("Please enter dimensions for the game.");
            }
            if(!name || name.length === 0){
                err.push("Please enter a name for the game.");
            }
            if(!name.match(/[a-zA-Z0-9\ _\-\(\)\?\!]+/)){
                err.push("Please use only alphanumeric characters and spaces in game names.");
            }
            if(x < 20 || y < 20){
                err.push("Minimum size: 20");
            }
            if(x > 200 || y > 200){
                err.push("Maximum size: 200");
            }
            if(err.length === 0){
                //TODO: validate name (no weird characters! alphanum)
                db.Games.name_exists(name, function(err, exists){
                    if(err) throw err;
                    if(!exists){
                        var data = {
                            name:name,
                            state:'open',
                            players:[uid],
                            grid_size:{x:Number(x),y:Number(y)},
                            start_state:[null, null],
                            sockets:[null,null]};
                        var game = new db.Game(data);
                        game.save(function(err){
                            if(err) throw err;
                            data.id = game.id;
                            sio.sockets.emit('new_game', {id: data.id, name: data.name, grid_size: data.grid_size});
                            cb({id:game.id, status:'ok'});
                        });
                    } else {
                    cb({errors:['Game name already taken.']});
                }
              });
            } else {
              cb({errors:err});
            }
        });

        socket.on('list_games', function(cb){
            db.Games.all_gids_in_state('open', function(err, gids){
              if(err) throw err;
              db.Games.by_ids(gids, function(err, games){
                var g_list = [];
                for (var g in games) {
                  var game = games[g];
                  g_list.push({id:game.id, name:game.name, grid_size:game.grid_size});
                  //TODO: get the (user)name of the creator of the game in here
                }
                cb(g_list);
              });
            });
        });

        socket.on('join', function(id, cb){
            //we don't currently support anonymous users
            if(!socket.handshake || !socket.handshake.session.auth){
                return cb({errors:["Please log in or register."]});
            }

            var uid = socket.handshake.session.auth.userId;
            db.Games.by_id(id, function(err, game) {
              if(err) throw err;
              if(game) {
                //if you are player 1 or player 2, do nothing
                if (game.players[0] === uid || game.players[1] === uid){
                  cb({game: {id: game.id, name: game.name, width: Number(game.grid_size.x) * 8 + 1, height: Number(game.grid_size.y) * 8 + 1, grid_size: game.grid_size}});
                //if you are joining, join
                } else if (game.players[1] === undefined){ //if there isn't already a second player, join
                  game.players[1] = uid;
                  //game.state = "open";
                  game.save(function(err){
                    if(err) throw err;
                    cb({game: {id: game.id, name: game.name, width: Number(game.grid_size.x) * 8 + 1, height: Number(game.grid_size.y) * 8 + 1, grid_size: game.grid_size}});
                  });
                } else {
                  cb({errors:['Not allowed to spectate.']});
                }
              } else {
                cb({errors:['This game does not exist.']});
              }
            });
        });

        var hs = socket.handshake;
        console.log('A socket with sessionID ' + hs.sessionID + ' connected!');
        // setup an inteval that will keep our session fresh
        var intervalID = setInterval(function () {
            // reload the session (just in case something changed,
            // we don't want to override anything, but the age)
            // reloading will also ensure we keep an up2date copy
            // of the session with our connection.
            hs.session.reload( function () {
                // "touch" it (resetting maxAge and lastAccess)
                // and save it back again.
                hs.session.touch().save();
            });
        }, 60 * 1000);

        function quit() {
            //check if there is a game in an unfinished state left behind and if there is, kill it
            //TODO: consider using a timeout for this so they can come back quickly
            var userId;
            if (socket.handshake && socket.handshake.session.auth)
                userId = socket.handshake.session.auth.userId;
            var gid = socket.gid;
            if (userId && gid){
                db.Games.by_id(gid, function(err, game){
                    if (err) throw err;
                    if (game) { // fix crash when browser with socket.io is open before the server restarts
                        var other_userid;
                        if (game.players[0] == userId) other_userid = game.players[1];
                        else if (game.players[1] == userId) other_userid = game.players[0];
                        socket_id = gid + ';' + other_userid;
                        if (sockets[socket_id]) sockets[socket_id].emit('other_player_disconnected');
                        if (['open', 'waiting1', 'waiting2'].indexOf(game.state) != -1) {
                            delete sockets[game.sockets[0]];
                            delete sockets[game.sockets[1]];
                            sio.sockets.emit('remove_game', game.id);
                            game.del();
                        }
                    } else {
                        console.warn("no socket handshake??");
                    }
                });
            }
        }

        socket.on('quit', function(){
            quit();
        });

        socket.on('disconnect', function () {
            quit();
            console.log('A socket with sessionID ' + hs.sessionID + ' disconnected!');
            // clear the socket interval to stop refreshing the session
            clearInterval(intervalID);
        });
    } ,
    init : function(s) {
        sio = s;
    }
};
