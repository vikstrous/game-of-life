var game_logic = require(__dirname + '/../public/js/shared/shared.js');
var redis = require("redis"),
    db = require(__dirname + '/../db.js');

var moore = [
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0]
];

var sio;

//mem stores
var rematches = {};

module.exports = {
    onconnect: function(socket) {


        socket.on('create', function(name, x, y, cb) {
            //we don't currently support anonymous users
            if (!socket.handshake || !socket.handshake.session.auth) {
                return cb({
                    errors: ["Please log in or register."]
                });
            }

            var uid = socket.handshake.session.auth.userId;
            var err = [];
            if (!x || !y) {
                err.push("Please enter dimensions for the game.");
            }
            if (!name || name.length === 0) {
                err.push("Please enter a name for the game.");
            }
            if (!name.match(/^[a-zA-Z0-9\ _\-\(\)\?\!]+$/)) {
                err.push("Please use only alphanumeric characters and spaces in game names. Nothing fancy.");
            }
            if (x < 20 || y < 20) {
                err.push("Minimum size: 20");
            }
            if (x > 200 || y > 200) {
                err.push("Maximum size: 200");
            }
            if (err.length === 0) {
                if (!db.GameAds.name_exists(name)) {
                    db.Users.by_id(uid, function(err, user) {
                        if (err) throw err;
                        var data = {
                            name: name,
                            state: 'open',
                            players: [uid],
                            grid_size: {
                                x: Number(x),
                                y: Number(y)
                            },
                            start_state: [null, null],
                            sockets: [null, null]
                        };
                        var game = new db.Game(data);
                        game.save();
                        game.open_ad(user);
                        sio.sockets.emit('new_game', {
                            id: game.id,
                            name: game.name,
                            grid_size: game.grid_size
                        });
                        cb({
                            id: game.id,
                            status: 'ok'
                        });
                    });
                } else {
                    cb({
                        errors: ['Game name already taken.']
                    });
                }
            } else {
                cb({
                    errors: err
                });
            }
        });


        socket.on('join', function(id, cb) {
            //example code:
            /*db.Users.by_id(uid, function(err, user){
                //TODO: verify that this user is allowed to join this game
                console.log(user);
            });*/

            //we don't currently support anonymous users
            if (!socket.handshake || !socket.handshake.session.auth) {
                return cb({
                    errors: ["Please log in or register."]
                });
            }

            var uid = socket.handshake.session.auth.userId;
            var game = db.Games.by_id(id);
            if (game) {
                socket.gid = id;
                //if you are player 1 or player 2, do nothing
                var player = game.players.indexOf(uid);
                if (player !== -1) {
                    cb({
                        game: {
                            id: game.id,
                            name: game.name,
                            width: Number(game.grid_size.x) * 8 + 1,
                            height: Number(game.grid_size.y) * 8 + 1,
                            grid_size: game.grid_size,
                            players: game.players
                        }
                    });
                    game.sockets[player] = socket;
                    //FIXME: this is a hack to make sure the client knows if they are player 1 or 2
                    if(player == 0){
                        socket.emit('waiting_for_player');//this tells you that you are player 1
                    }
                //if you are joining, join
                } else if (game.players[1] === undefined) { //if there isn't already a second player, join
                    game.close_ad();
                    sio.sockets.emit('remove_game', game.id);
                    game.players[1] = uid;
                    game.sockets[1] = socket;
                    if (game.state == 'open') {
                        game.state = "waiting1";
                    }
                    cb({
                        game: {
                            id: game.id,
                            name: game.name,
                            width: Number(game.grid_size.x) * 8 + 1,
                            height: Number(game.grid_size.y) * 8 + 1,
                            grid_size: game.grid_size,
                            players: game.players
                        }
                    });
                } else {
                    cb({
                        errors: ['Not allowed to spectate.']
                    });
                }
            } else {
                cb({
                    errors: ['This game does not exist.']
                });
            }
        });

        socket.on('grid_play', function(data) {
            var gid = socket.gid;
            game = db.Games.by_id(gid);
            if (!game) {
                console.log('derp');
                return;
            }
            //we don't currently support anonymous users
            if (!socket.handshake || !socket.handshake.session.auth) {
                return;
            }
            var userId = socket.handshake.session.auth.userId;
            //TODO: handle this in a way to makes sense: send a message saying "you are not in this game"; this currently crashes the server
            console.assert((userId == game.players[0] || userId == game.players[1]), "The player IDs of game " + game.id + " are wrong: " + game.players);
            if (game.players[0] == userId) {
                game.start_state[0] = data.points;
            } else {
                game.start_state[1] = data.points;
            }
            //TODO: WHAT IF THE SAME PLAYER PLAYS TWICE???
            // (let the player play before the enemy joins)
            if (game.state == 'waiting1' || game.state == 'open') {
                game.state = 'waiting2';
                socket.emit('waiting_to_start');
            } else if (game.state == 'waiting2') {
                game.state = 'processing';

                //TODO: do this in parallel outside of node?
                var grid = [],
                    i, point;
                for (i = 0; i < game.grid_size.x; i++) {
                    grid[i] = [];
                    for (var j = 0; j < game.grid_size.y; j++) {
                        grid[i][j] = 0;
                    }
                }
                for (i = 0; i < game.start_state[0].length; i++) {
                    point = game.start_state[0][i];
                    if (point.x < game.grid_size.x / 2) {
                        grid[point.x][point.y] = 1;
                    }
                }
                for (i = 0; i < game.start_state[1].length; i++) {
                    point = game.start_state[1][i];
                    if (point.x >= game.grid_size.x / 2) {
                        grid[point.x][point.y] = 2;
                    }
                }
                //TODO: handle the case when the other player already quit and the game is destroyed!!
                if (game.sockets[0]) game.sockets[0].emit('grid_played', grid);
                if (game.sockets[1]) game.sockets[1].emit('grid_played', grid);

                //RESOLVE THE GAME
                var iteration = 1;
                var winner = -1;
                while (winner < 0) {
                    iteration++;
                    grid = game_logic.update(grid, game.grid_size);
                    winner = game_logic.winner(iteration, game_logic.grid_pop(grid, game.grid_size));
                }

                game.state = 'archived';
                game.archive(function(err) {
                    if (err) throw err;
                    db.Users.by_id(game.players[0], function(err, player1) {
                        if (winner === 1) {
                            player1.win(game.id);
                        } else if (winner === 2) {
                            player1.lose(game.id);
                        } else if (winner === 0) {
                            player1.tie(game.id);
                        }
                    });
                    db.Users.by_id(game.players[1], function(err, player2) {
                        if (winner === 1) {
                            player2.lose(game.id);
                        } else if (winner === 2) {
                            player2.win(game.id);
                        } else if (winner === 0) {
                            player2.tie(game.id);
                        }
                    });
                });
            }
        });

        socket.on('rematch', function(gid, cb) {
            // we don't currently support anonymous users
            if (!socket.handshake || !socket.handshake.session.auth) {
                return cb({
                    errors: ["Please log in or register."]
                });
            }
            var uid = socket.handshake.session.auth.userId;

            // store the rematches used by this user in the socket so that they can be removed when
            //the client disconnects
            if (typeof socket.rematches === 'array') {
                socket.rematches.push(gid);
            } else {
                socket.rematches = [gid];
            }

            // if we are the first one to want a rematch store our callback
            if (!rematches[gid]) {
                rematches[gid] = {
                    id: uid,
                    cb: cb,
                    socket: socket
                };
                // if someone else already is waiting for a rematch
            } else {
                var game = db.Games.by_id(gid);
                //get info
                var other_uid = rematches[gid].id;
                var other_cb = rematches[gid].cb;
                var other_socket = rematches[gid].socket;
                //does game still exist?
                if (!game) {
                    cb({
                        errors: ["Attempt to rematch a non-existent game."]
                    });
                    //TODO: try catch?
                    other_cb({
                        errors: ["Attempt to rematch a non-existent game."]
                    });
                    return;
                }
                var player = game.players.indexOf(uid);
                if (player == -1) {
                    cb({
                        errors: ["Attempt to rematch a game you didn't play."]
                    });
                    //TODO: try catch?
                    other_cb({
                        errors: ["Attempt to rematch a game you didn't play."]
                    });
                    return;
                }
                // create the game!!!
                //TODO: make it a special "rematch game"
                var data = {
                    name: (new Date()).getTime(),
                    state: 'waiting1',
                    players: [uid, other_uid],
                    grid_size: game.grid_size,
                    start_state: [null, null],
                    sockets: [null, null]
                };
                game.del();
                delete socket.gid;
                var new_game = new db.Game(data);
                new_game.save();
                cb({
                    id: new_game.id,
                    status: 'ok'
                });
                //TODO: try, catch?
                other_cb({
                    id: new_game.id,
                    status: 'ok'
                });
            }
        });

        socket.on('list_games', function(cb) {
            cb(db.GameAds.open_games());
        });

        var hs = socket.handshake;
        console.log('A socket with sessionID ' + hs.sessionID + ' connected!');
        // setup an inteval that will keep our session fresh
        var intervalID = setInterval(function() {
            // reload the session (just in case something changed,
            // we don't want to override anything, but the age)
            // reloading will also ensure we keep an up2date copy
            // of the session with our connection.
            hs.session.reload(function() {
                // "touch" it (resetting maxAge and lastAccess)
                // and save it back again.
                hs.session.touch().save();
            });
        }, 60 * 1000);

        function quit() {
            //check if there is a game in an unfinished state left behind and if there is, kill it
            //TODO: consider using a timeout for this so they can come back quickly
            var userId;
            if (socket.handshake && socket.handshake.session.auth) userId = socket.handshake.session.auth.userId;
            var gid = socket.gid;
            delete socket.gid;

            if (socket.rematches) {
                for (var r in socket.rematches) {
                    delete rematches[socket.rematches[r]];
                }
            }

            if (userId && gid) {
                var game = db.Games.by_id(gid);
                if (game) { // fix crash when browser with socket.io is open before the server restarts
                    var other_user;
                    if (game.players[0] == userId) other_user = 1;
                    else if (game.players[1] == userId) other_user = 0;
                    if (game.sockets[other_user]) game.sockets[other_user].emit('other_player_disconnected');
                    if (['open', 'waiting1', 'waiting2', 'archived'].indexOf(game.state) != -1) {
                        sio.sockets.emit('remove_game', game.id);
                        game.del();
                    }
                } else {
                    console.warn("no socket handshake??");
                }
            }
        }

        socket.on('quit', function() {
            quit();
        });

        socket.on('disconnect', function() {
            quit();
            console.log('A socket with sessionID ' + hs.sessionID + ' disconnected!');
            // clear the socket interval to stop refreshing the session
            clearInterval(intervalID);
        });
    },
    init: function(s) {
        sio = s;
    }
};
