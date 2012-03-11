//var grid_colors = ["#ff00ff","#00ffff","#ffff00"];
var grid_colors = ["22ff22", "ff2222"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;
var grid;
var grid_size;
var iteration = 1;

var socket = io.connect();
var player1 = false;
var playing = false;
var pop;

$(document).ready(function() {
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
	$("#info_display").show();
	animation_id = setInterval("update()", 1000/20);
});

function update() {
		grid = game_logic.update(grid, grid_size);
		pop = game_logic.grid_pop(grid, grid_size);
		repaint(pop);
		iteration++;
		if(iteration >= game_logic.generation_limit || pop.pop1 == 0 || pop.pop2 == 0) {
			clearInterval(animation_id);
			var winner = 0;
			if(pop.pop1 > pop.pop2) winner = 1;
			if(pop.pop2 > pop.pop1) winner = 2;
			display_winner(winner);
		}
}

function display_winner(winner) {
		var win_str;
		switch(winner) {
			case 0: win_str = "Tie Game!"; break;
			case 1: win_str = player1 ? "You win!" : "You lose!"; break;
			case 2: win_str = player2 ? "You win!" : "You lose!"; break;
		}
		alert(win_str);
}

function repaint(pop) {
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
	
	if(playing) {
		$("#pop1").html(pop.pop1);
		$("#pop2").html(pop.pop2);
		$("#gen").html(iteration);
	}
}

function clicked(e) {	
	if(!playing) {
		var x, y;
		// Get the mouse position relative to the canvas element.
		if (e.offsetX || e.offsetX == 0) {
			x = e.offsetX;
			y = e.offsetY;
		} else if (e.layerX || e.layerX == 0) {
			x = e.layerX;
			y = e.layerY;
			var offset = $("#game_of_life").offset();
			x -= offset.left;
			y -= offset.top;
		}
		var screen_width = document.getElementById("game_of_life").width;
		var p_x = Math.floor(x/screen_width*grid_size.x),
		var p_y = Math.floor(y/screen_width*grid_size.y)

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
