var game_logic = require(__dirname + '/../shared/shared.js');
var redis = require("redis"),
    db = require(__dirname + '/../db.js');

var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];

module.exports = {
onconnect : function (socket) {
	
	socket.on('page_ready', function(data) {
		var userId = socket.handshake.session.auth.userId;
		db.user_by_id(userId, function(err, user){
			console.log(user);
		});
		socket.gid = data;
		db.game_by_id(socket.gid, function(err, game) {
			if(game.players[1] == undefined) {
				socket.emit('waiting_for_player');
			} else {
				var data = {
					grid_size : game.grid_size,
				}
				socket.emit('page_ready_response', data);
				socket.broadcast.emit('page_ready_response', data);
			}
		});
	});
	
	socket.on('grid_play', function(data) {
		var gid = socket.gid;
		db.game_by_id(gid, function(err, game) {
			var userId = socket.handshake.session.auth.userId;
			console.assert((userId == game.players[0] || userId == game.players[1]), "The player IDs of game " + game.id + " are wrong: " + game.players);
			if(game.players[0] == userId) {
				game.start_state[0] = data.points;
			} else {
				game.start_state[1] = data.points;
			}
			if(game.state == 'waiting1') {
				game.state = 'waiting2';
				db.update_game(gid, game, function(err){
					if(err) throw err;
					socket.emit('waiting_to_start');
				});
			} else {
				db.state = 'processing';
				db.update_game(gid, game, function(err){
					if(err) throw err;
					var grid = new Array();
					for(var i = 0; i < game.grid_size.x; i++) {
						grid[i] = new Array();
						for(var j = 0; j < game.grid_size.y; j++) {
							grid[i][j] = 0;
						}
					}
					for(var i = 0; i < game.start_state[0].length; i++) {
						var point = game.start_state[0][i];
						if(point.x < game.grid_size.x / 2) {
							grid[point.x][point.y] = 1;
						}
					}
					for(var i = 0; i < game.start_state[1].length; i++) {
						var point = game.start_state[1][i];
						if(point.x >= game.grid_size.x / 2) {
							grid[point.x][point.y] = 2;
						}
					}
					socket.broadcast.emit('grid_played', grid);
					socket.emit('grid_played', grid);
					var iteration = 1;
					var winner = -1;
					while(winner < 0) {
						iteration++;
						grid = game_logic.update(grid, game.grid_size);
						winner = game_logic.winner(iteration, game_logic.grid_pop(grid, game.grid_size));
					}
					//TODO: archive the game record and update player records with wins/losses.
					db.game_state_change(gid, 'archived', function(err){
						if(err) throw err;
						db.user_by_id(game.players[0], function(err, player1){
							if(winner == 1){
								player1.wins += 1;
							} else if (winner == 2) {
								player1.losses += 1;
							} else if (winner == 0) {
								player1.ties += 1;
							}
							db.update_user(player1.id, player1);
						});
						db.user_by_id(game.players[1], function(err, player2){
							if(winner == 1){
								player2.losses += 1;
							} else if (winner == 2) {
								player2.wins += 1;
							} else if (winner == 0) {
								player2.ties += 1;
							}
							db.update_user(player2.id, player2);
						});
					});
				});
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
  
	socket.on('disconnect', function () {
		console.log('A socket with sessionID ' + hs.sessionID + ' disconnected!');
		// clear the socket interval to stop refreshing the session
		clearInterval(intervalID);
	});
} ,
init : function() {
}
}

function modToRange(val, lower, upper) {
	while(val < lower) { val += (upper - lower); }
	while(val >= upper) { val -= (upper - lower); }
	return val;
}

function updateGrid() {
	var newGrid = new Array();
	for(var i = 0; i < grid_size.x; i++) {
		newGrid[i] = new Array();
		for(var j = 0; j < grid_size.y; j++) {
        	var sum = new Array();
			sum[0] = 0;
			sum[1] = 0;
			sum[2] = 0;
			for(var co = 0; co < moore.length; co++) {
				var g_x = modToRange(i + moore[co][0], 0, grid_size.x);
				var g_y = modToRange(j + moore[co][1], 0, grid_size.y);
				if(grid[g_x][g_y] > 0) {
					sum[0]++;
					sum[grid[g_x][g_y]]++;
				}
			}
			if(grid[i][j] == 0 && sum[0] == 3) {
				if(sum[1] > sum[2]) {
					newGrid[i][j] = 1;
				} else {
					newGrid[i][j] = 2;
				}
			} else if(grid[i][j] > 0 && (sum[0] == 2 || sum[0] == 3)) {
				if(sum[1] > sum[2]) {
					newGrid[i][j] = 1;
				} else if(sum[2] > sum[1]) {
					newGrid[i][j] = 2;
				} else {
					newGrid[i][j] = grid[i][j];
				}
			} else {
				newGrid[i][j] = 0;             
			}
		}
	}
	for(var i = 0; i < grid_size.x; i++) {
		for(var j = 0; j < grid_size.y; j++) {
			grid[i][j] = newGrid[i][j];
		}
	}
}

