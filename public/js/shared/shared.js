var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var game_logic = {
	generation_limit : 500,
	update : function(grid, grid_size) {
		var newGrid = new Array();
		for(var i = 0; i < grid_size.x; i++) {
			newGrid[i] = new Array();
			for(var j = 0; j < grid_size.y; j++) {
				var sum = new Array();
				sum[0] = 0;
				sum[1] = 0;
				sum[2] = 0;
				for(var co = 0; co < moore.length; co++) {
					var g_x = game_logic.mod(i + moore[co][0], grid_size.x);
					var g_y = game_logic.mod(j + moore[co][1], grid_size.y);
					if(grid[g_x][g_y] > 0) {
						sum[0]++;
						sum[grid[g_x][g_y]]++;
					}
				}
				if(grid[i][j] == 0 && sum[0] == 3) {
					newGrid[i][j] = (sum[1] > sum[2]) ? 1 : 2;
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
		return newGrid;
	},
	mod: function(val, upper) {
		upper = Number(upper);
		return ((val % upper) +upper) % upper;
	},
	grid_pop: function(grid, grid_size) {
		var pop1 = 0;
		var pop2 = 0;
		for(var i = 0; i < grid_size.x; i++) {
			for(var j = 0; j < grid_size.y; j++) {
				if(grid[i][j] != 0) {
					(grid[i][j] == 1) ? pop1++ : pop2++;
				}
			}
		}
		return {pop1: pop1, pop2: pop2};
	},
	winner: function(iteration, pop) {
		if(iteration >= game_logic.generation_limit || pop.pop1 == 0 || pop.pop2 == 0) {
			var winner = 0;
			if(pop.pop1 > pop.pop2) winner = 1;
			if(pop.pop2 > pop.pop1) winner = 2;
			return winner;
		} else {
			return -1;
		}
	}
};
if("undefined" !== typeof(module) && module.exports !== undefined) {
	module.exports = game_logic;
}
