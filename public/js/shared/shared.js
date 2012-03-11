var moore = [[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0]];
var game_logic = {
	generation_limit : 5000,
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
					var g_x = game_logic.modToRange(i + moore[co][0], 0, grid_size.x);
					var g_y = game_logic.modToRange(j + moore[co][1], 0, grid_size.y);
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
	modToRange: function(val, lower, upper) {
		while(val < lower) { val+= (upper - lower); }
		while(val >= upper) { val -= (upper - lower); }
		return val;
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
	}
};
if("undefined" !== typeof(module) && module.exports !== undefined) {
	module.exports = game_logic;
}
