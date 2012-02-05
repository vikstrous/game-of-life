<html>
	<head>
		<title>Life of Game</title>
		<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
		<script type="text/javascript">
		
			var grid_size = 50;
			var grid = new Array();
			//var grid_colors = ["#ff00ff","#00ffff","#ffff00"];
			var grid_colors = ["222222"];
			var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
			var animation_id;
			
			
			$(document).ready(function(){
				for(var i = 0; i < grid_size; i++) {
					grid[i] = new Array();
					for(var j = 0; j < grid_size; j++) {
						grid[i][j] = 0;
					}
				}
				document.getElementById("game_of_life").addEventListener('click', clicked, false);
				$("#play_pause").data("value", "play");
				$("#play_pause").click(function() {
					if($("#play_pause").data("value") == "play") {
						$("#play_pause").data("value", "pause");
						$("#play_pause").html("Pause");
						animation_id = window.setInterval(repaint, 60 / 1000);
					} else {
						window.clearInterval(animation_id);
						$("#play_pause").data("value", "play");
						$("#play_pause").html("Play");
					}
				});
				repaint();
			});
			
			function updateGrid() {
				var newGrid = new Array();
				for(var i = 1; i < grid_size - 1; i++) {
					newGrid[i] = new Array();
					for(var j = 1; j < grid_size - 1; j++) {
						var sum = 0;
						for(var co = 0; co < moore.length; co++) {
							if(grid[i + moore[co][0]][j + moore[co][1]] > 0) {
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
				for(var i = 1; i < grid_size - 1; i++) {
					for(var j = 1; j < grid_size - 1; j++) {
						grid[i][j] = newGrid[i][j];
					}
				}
			}

			function updateFromServer(newGrid) {
				for(var i = 1; i < grid_size - 1; i++) {
					for(var j = 1; j < grid_size - 1; j++) {
						grid[i][j] = newGrid[i][j];
					}
				}
			}
			
			function repaint() {
				var canvas = document.getElementById("game_of_life");
				var context = canvas.getContext("2d");
				
				if($("#play_pause").data("value") == "pause") {
					updateGrid();
				}
				
				context.clearRect(0, 0, canvas.width, canvas.height);
				
				var screen_width = document.getElementById("game_of_life").width
				var line_separation = screen_width / grid_size;
				for(var i = 0; i <= grid_size; i++) {
					context.moveTo(0, i*line_separation);
					context.lineTo(screen_width, i*line_separation);
					
					context.moveTo(i*line_separation, 0);
					context.lineTo(i*line_separation, screen_width);
				}
				
				context.fillStyle = "";
				context.strokeStyle = "#000000";
				context.lineWidth = 0.7;
				context.stroke();
				
				for(var i = 0; i < grid_size; i++) {
					for(var j = 0; j < grid_size; j++) {
						if(grid[i][j] > 0) {
							context.beginPath();
							context.rect(i*line_separation + 1, j*line_separation + 1, line_separation - 2, line_separation - 2);
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
				// Get the mouse position relative to the canvas element.
				if (e.layerX || ev.layerX == 0) { // Firefox
					x = e.layerX;
					y = e.layerY;
				} else if (ev.offsetX || ev.offsetX == 0) { // Opera
					x = e.offsetX;
					y = e.offsetY;
				}
				var screen_width = document.getElementById("game_of_life").width
				var g_x = Math.round(x/screen_width*grid_size) - 1;
				var g_y = Math.round(y/screen_width*grid_size) - 1;
				grid[g_x][g_y] = (grid[g_x][g_y] + 1) % (grid_colors.length + 1);
				repaint();
			}
		</script>
	</head>
	<body>
		<canvas id="game_of_life" width=800 height=800 style="border: 1px solid black"></canvas>
		<br/>
		<button id="play_pause">Play</button>
		<br/>
	</body>
</html>
