
/*
	Functionality for searching for users and patterns.
*/

var con = require('./database.js').connection;

module.exports = {
	
/*
	searchUser(query, cb)
	Searches the users table, matching name against the given query. Empty query returns full table.

	searchPatterns(query, numObjects, cb)
		Searches the patterns table, matching name & description against the given query. If numObjects given, filter to include only patterns with that number of objects.

	getMaxDifficulty(cb)
		Get the max difficulty value out of all patterns.

	scaleOutOfTen(maxDifficulty, difficulty)
		Return 10 * (difficulty) / maxDifficulty

*/

}