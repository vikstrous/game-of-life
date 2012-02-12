var redis = require("redis"),
    db = require(__dirname + '/../db.js');

var grid_size;
var grid;
var grid_colors = ["222222"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;
var players = {p1:false,p2:false};
var start_wait = false;

module.exports = {
onconnect : function (socket) {
	
	socket.on('page_ready', function(data) {
		if(players.p1 == false) {
			players.p1 = true;
			socket.emit('waiting_for_player');
		} else {
			players.p2 = true;
			var data = {
				grid_size : grid_size,
				grid : grid
			}
			socket.emit('page_ready_response', data);
			socket.broadcast.emit('page_ready_response', data);
		}
	});
	
	socket.on('grid_click', function (data) {
		if(grid[data.p_x][data.p_y] == 0) {
			if(data.player1 && data.p_x < grid_size.x / 2) {
				grid[data.p_x][data.p_y] = 1;
			} else if(!data.player1 && data.p_x >= grid_size.x / 2) {
				grid[data.p_x][data.p_y] = 2;
}
		} else {
			if(data.player1 && data.p_x < grid_size.x / 2) {
				grid[data.p_x][data.p_y] = 0;
			} else if(!data.player1 && data.p_x >= grid_size.x / 2) {
				grid[data.p_x][data.p_y] = 0;
}
		}
		var response_data = {
			x : data.p_x, y : data.p_y, new_value : grid[data.p_x][data.p_y]
		};
		socket.broadcast.emit('grid_click_response', response_data);
		socket.emit('grid_click_response', response_data);
	});

	socket.on('grid_play', function(data) {
		if(!start_wait) {
			start_wait = true;
			socket.emit('waiting_to_start');
		} else {
			socket.broadcast.emit('grid_played', null);
			socket.emit('grid_played', null);
			animation_id = setInterval(function() {
				updateGrid();
				socket.broadcast.emit('grid_update', grid);
				socket.emit('grid_update', grid);
			}, 1000 / 30);
		}
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
		clearInterval(animation_id);
	});
} ,
init : function() {
	grid_size = {
		x : 50, y : 50
	};
	grid = new Array();
	for(var i = 0; i < grid_size.x; i++) {
		grid[i] = new Array();
		for(var j = 0; j < grid_size.y; j++) {
			grid[i][j] = 0;
		}
	}
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
                                sum[grid[i][j]]++;
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

