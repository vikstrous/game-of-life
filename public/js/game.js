//var grid_colors = ["#ff00ff","#00ffff","#ffff00"];
var grid_colors = ["222222"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;

var socket = io.connect('http://localhost');

$(document).ready(function(){	
	document.getElementById("game_of_life").addEventListener('click', clicked, false);
	$("#play_pause").data("value", "play");
	$("#play_pause").click(function() {
		if($("#play_pause").data("value") == "play") {
			$("#play_pause").data("value", "pause");
			$("#play_pause").html("Pause");
			socket.emit('grid_play', null);
		} else {
			$("#play_pause").data("value", "play");
			$("#play_pause").html("Play");
			socket.emit('grid_pause', null);
		}
	});
	socket.emit('page_ready',null);
});
socket.on('page_ready_response', function(data) {
	grid_size = data.grid_size;
	grid = new Array();
	for(var i = 0; i < grid_size.x; i++) {
		grid[i] = new Array();
		for(var j = 0; j < grid_size.y; j++) {
			grid[i][j] = data.grid[i][j];
		}
	}
	repaint();
});
socket.on('grid_click_response', function(data) {
	grid[data.x][data.y] = data.new_value;
	repaint();
});
socket.on('grid_update', function(newGrid) {
	for(var i = 0; i < grid_size.x; i++) {
		for(var j = 0; j < grid_size.y; j++) {
			grid[i][j] = newGrid[i][j];
		}
	}
	repaint();
});

function repaint() {
	var canvas = document.getElementById("game_of_life");
	var context = canvas.getContext("2d");
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	var screen_width = document.getElementById("game_of_life").width
	var screen_height = document.getElementById("game_of_life").height
	var line_separation = {
		x : screen_width / grid_size.x,
		y : screen_height / grid_size.y
	};
	for(var i = 0; i <= grid_size.x; i++) {
		context.moveTo(i*line_separation.x, 0);
		context.lineTo(i*line_separation.x, screen_height);
	}	
	for(var i = 0; i <= grid_size.y; i++) {
		context.moveTo(0, i*line_separation.y);
		context.lineTo(screen_width, i*line_separation.y);
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
	var data = {
		p_x : Math.floor(x/screen_width*grid_size.x),
		p_y : Math.floor(y/screen_width*grid_size.y)
	};
	socket.emit('grid_click', data);
	repaint();
}
