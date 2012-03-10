//var grid_colors = ["#ff00ff","#00ffff","#ffff00"];
var grid_colors = ["22ff22", "ff2222"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;
var grid;
var grid_size;

var socket = io.connect();
var player1 = false;
var playing = false;

$(document).ready(function(){	
	document.getElementById("game_of_life").addEventListener('click', clicked, false);
	$("#play_pause").data("value", "play");
	$("#play_pause").click(function() {
		if($("#play_pause").data("value") == "play") {
			$("#play_pause").data("value", "pause");
			var data = { points:new Array() };
			for(var i = 0; i < grid_size.x; i++) {
				for(var j = 0; j < grid_size.y; j++) {
					if(grid[i][j] > 0) {
						data.points.push({x:i,y:j});
					}
				}
			}
			socket.emit('grid_play', data);
		}
	});
	socket.emit('page_ready',$("#gid").html());
});
socket.on('waiting_for_player', function() {
	$('#header').html('Waiting for player to join...');
	player1 = true;
});
socket.on('waiting_to_start', function() {
	$('#play_pause').html('Waiting...');
	playing = true;
});
socket.on('page_ready_response', function(data) {
	if(player1) {
		$('#header').html('Battle! (Player 1)');
	} else {
		$('#header').html('Battle! (Player 2)');
	}	
	grid_size = data.grid_size;
	grid = new Array();
	for(var i = 0; i < grid_size.x; i++) {
		grid[i] = new Array();
		for(var j = 0; j < grid_size.y; j++) {
			grid[i][j] = 0;
		}
	}
	repaint();
});
socket.on('grid_played', function(data) {
	$("#play_pause").html("Playing");
	grid = data;
	playing = true;
	animation_id = setInterval("update()", 1000/30);
});

function update() {
		grid = game_logic.update(grid, grid_size);
		repaint();
}

function repaint() {
	var i_start, i_stop;
	if(!playing) {
		if(player1) {
			i_start = 0;
			i_stop = grid_size.x / 2;
		} else {
			i_start = grid_size.x / 2;
			i_stop = grid_size.x;
		}
	} else {
		i_start = 0;
		i_stop = grid_size.x;
	}
	var canvas = document.getElementById("game_of_life");
	var context = canvas.getContext("2d");
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	var screen_width = document.getElementById("game_of_life").width
	var screen_height = document.getElementById("game_of_life").height
	var line_separation = {
		x : screen_width / grid_size.x,
		y : screen_height / grid_size.y
	};
	for(var i = i_start; i <= i_stop; i++) {
		context.moveTo(i*line_separation.x, 0);
		context.lineTo(i*line_separation.x, screen_height);
	}
	for(var i = 0; i <= grid_size.y; i++) {
		context.moveTo(i_start*line_separation.x, i*line_separation.y);
		context.lineTo(i_stop*line_separation.x, i*line_separation.y);
	}
	
	context.fillStyle = "";
	context.strokeStyle = "#333333";
	context.lineWidth = 2;
	context.stroke();
	
	for(var i = 0; i < grid_size.x; i++) {
		for(var j = 0; j < grid_size.y; j++) {
			if(grid[i][j] > 0) {
				context.beginPath();
				context.rect(i*line_separation.x, j*line_separation.y, line_separation.x, line_separation.y);
				context.fillStyle = grid_colors[grid[i][j] - 1];
				context.strokeStyle = "";
				context.fill();
				context.stroke();
			}
		}
	}
}

function clicked(e) {	
	if(!playing) {
		var x, y;
		var offset = $("#game_of_life").offset();
		// Get the mouse position relative to the canvas element.
		if (e.layerX || ev.layerX == 0) {
			x = e.layerX;
			y = e.layerY;
		} else if (ev.offsetX || ev.offsetX == 0) {
			x = e.offsetX;
			y = e.offsetY;
		}
		x -= offset.left;
		y -= offset.top;
		var screen_width = document.getElementById("game_of_life").width;
		p_x = Math.floor(x/screen_width*grid_size.x),
		p_y = Math.floor(y/screen_width*grid_size.y)

		if(grid[p_x][p_y] == 0) {
                        if(player1 && p_x < grid_size.x / 2) {
                                grid[p_x][p_y] = 1;
                        } else if(!player1 && p_x >= grid_size.x / 2) {
                                grid[p_x][p_y] = 2;
			}
                } else {
                        if(player1 && p_x < grid_size.x / 2) {
                                grid[p_x][p_y] = 0;
                        } else if(!player1 && p_x >= grid_size.x / 2) {
                                grid[p_x][p_y] = 0;
			}
                }
		repaint();
	}
}
