var grid_size;
var grid;
var grid_colors = ["222222"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;

module.exports = function (socket) {

	for(var i = 0; i < grid_size; i++) {
		grid[i] = new Array();
		for(var j = 0; j < grid_size; j++) {
			grid[i][j] = 0;
		}
	}
	socket.on('page_ready', function(data) {
		grid_size = {
			x : 25,
			y : 30
		};
		grid = new Array();
		for(var i = 0; i < grid_size.x; i++) {
			grid[i] = new Array();
			for(var j = 0; j < grid_size.y; j++) {
				grid[i][j] = 0;
			}
		}

		grid[2][2] = 1;
		grid[2][3] = 1;

		var data = {
			grid_size : grid_size,
			grid : grid
		}
		socket.emit('page_ready_response', data);
	});
	
	socket.on('grid_click', function (data) {
		grid[data.p_x][data.p_y] = (grid[data.p_x][data.p_y] + 1) % (grid_colors.length + 1);
		var response_data = {
			x : data.p_x, y : data.p_y, new_value : grid[data.p_x][data.p_y]
		};
		socket.emit('grid_click_response', response_data);
	});

	socket.on('grid_play', function(data) {
		animation_id = setInterval(function() {
			updateGrid();
			socket.emit('grid_update', grid);
		}, 1000 / 60);
	});

	socket.on('grid_pause', function(data) {
		clearInterval(animation_id);
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
};

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
                        var sum = 0;
                        for(var co = 0; co < moore.length; co++) {
				var g_x = modToRange(i + moore[co][0], 0, grid_size.x);
				var g_y = modToRange(j + moore[co][1], 0, grid_size.y);
                                if(grid[g_x][g_y] > 0) {
                                        sum++;
                                }
                        }
                        if(grid[i][j] == 0 && sum == 3) {
                                newGrid[i][j] = 1;
                        } else if(grid[i][j] > 0 && (sum == 2 || sum == 3)) {
                                newGrid[i][j] = 1;
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

