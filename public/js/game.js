//var grid_colors = ["#ff00ff","#00ffff","#ffff00"];
var grid_colors = ["rgb(40,255,40)", "rgb(255,40,40)"];
var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var animation_id;
var grid;
var grid_size;
var iteration = 1;

var player1 = false;
var playing = false;
var started = false;
var pop;
var current_template = {name: 'default', tiles: [[1]], type: 'default'};
var current_gid;

function join_game(data){
	grid_size = data.grid_size;
	current_gid = data.id;
	init_template_pane();
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
	$('[id^="template_pick_"]').on('click', function() {
		picked_template($(this))
	});
	socket.emit('page_ready', current_gid);
}
socket.on('waiting_for_player', function() {
	$('#header').html('Waiting for player to join...');
	player1 = true;
});
socket.on('waiting_to_start', function() {
	$('#play_pause').html('Waiting...');
	playing = true;
});
socket.on('other_player_disconnected', function() {
	$('#header').html('Other player disconnected.');
});
socket.on('page_ready_response', function(data) {
	started = true;
	if(player1) {
		$('#header').html('Battle! (Player 1)');
	} else {
		$('#header').html('Battle! (Player 2)');
	}	
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
		iteration++;
		repaint(pop);
		var winner = game_logic.winner(iteration, pop);
		if(winner >= 0) {
			clearInterval(animation_id);
			display_winner(winner);
		}
}

function display_winner(winner) {
		var win_str;
		switch(winner) {
			case 0: win_str = "Tie Game!"; break;
			case 1: win_str = player1 ? "You win!" : "You lose!"; break;
			case 2: win_str = (!player1) ? "You win!" : "You lose!"; break;
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
	
	var screen_width = document.getElementById("game_of_life").width - 1;
	var screen_height = document.getElementById("game_of_life").height - 1;
	var line_separation = {
		x : screen_width / grid_size.x,
		y : screen_height / grid_size.y
	};
	for(var i = i_start; i <= i_stop; i++) {
		context.moveTo(i*line_separation.x + 0.5, 0.5);
		context.lineTo(i*line_separation.x + 0.5, screen_height + 0.5);
	}
	for(var i = 0; i <= grid_size.y; i++) {
		context.moveTo(i_start*line_separation.x + 0.5, i*line_separation.y + 0.5);
		context.lineTo(i_stop*line_separation.x + 0.5, i*line_separation.y + 0.5);
	}
	
	context.fillStyle = "";
	context.strokeStyle = "#333333";
	context.lineWidth = 1;
	context.stroke();
	
	for(var i = 0; i < grid_size.x; i++) {
		for(var j = 0; j < grid_size.y; j++) {
			if(grid[i][j] > 0) {
				context.beginPath();
				context.rect(i*line_separation.x + 0.5, j*line_separation.y + 0.5, line_separation.x, line_separation.y);
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
	if(!playing && started) {
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
		var screen_height = document.getElementById("game_of_life").height;
		var p_x = Math.floor(x/screen_width*grid_size.x);
		var p_y = Math.floor(y/screen_height*grid_size.y);

		var tiles = current_template.tiles;
		var bounds;
		if(player1) {
			bounds = {l:0,t:0,r:grid_size.x/2,b:grid_size.y};
		} else {
			bounds = {l:grid_size.x/2,t:0,r:grid_size.x,b:grid_size.y};
		}

		for (var i = 0; i < tiles.length; i++) {
			for(var j = 0; j < tiles[0].length; j++) {
				var n_x = p_x + j;
				var n_y = p_y + i;
				if(n_x >= bounds.l && n_x < bounds.r && n_y >= bounds.t && n_y < bounds.b) {
					if(tiles[i][j] == 0) {
						grid[n_x][n_y] = 0;
					} else {
						if(player1) {
							grid[n_x][n_y] = 1;
						} else {
							grid[n_x][n_y] = 2;
						}
					}
				}
			}
		}
		repaint();
	}
}
function init_template_pane() {
	for(var i = 0; i < library.length; i++) {
		var type_name = library[i].name;
		$('#template_content').append($('<h1>').text(library[i].hrname));
        for(var j = 0; j < library[i].list.length; j++) {
			var $div = $('<div>');
			$div.attr('id', 'template_pick_' +  library[i].list[j].name + '_' + type_name);
			$div.addClass('template_pick');
			$div.append($('<h2>').text(library[i].list[j].hrname));
			$div.append(getTableForTiles(library[i].list[j].tiles, library[i].list[j].name));
			$('#template_content').append($div);
		}
	}
	$('#template_content :nth-child(2)').addClass('template_selected');
	$(function() {
		$('.scroll-pane').jScrollPane();
	});
}
function getTableForTiles(tiles, name) {
	var tableHTML = '<table>';
	var width = tiles[0].length;
	var height = tiles.length;
	for(var i = 0; i < height; i++) {
		tableHTML += '<tr>';
		for(var j = 0; j < width; j++) {
			tableHTML += '<td class="select_' + ((tiles[i][j] == 1) ? 'on' : 'off') + '"></td>';
		}
		tableHTML += '</tr>';
	}
	tableHTML += '</table>';
	return tableHTML;
}
function picked_template($template) {
	var split = $template.attr('id').split('_');
	var template_name = split[2];
	var template_type = split[3];
	var old_template = current_template;
	for(var i = 0; i < library.length; i++) {
		if(library[i].name == template_type) {
			for(var j = 0; j < library[i].list.length; j++) {
				if(library[i].list[j].name == template_name) {
					current_template = library[i].list[j];
					current_template.type = library[i].name;
					break;
				}
			}
		}
	}
	$('#template_pick_' + old_template.name + '_' + old_template.type).removeClass('template_selected');
	$('#template_pick_' + current_template.name + '_' + current_template.type).addClass('template_selected');
}
