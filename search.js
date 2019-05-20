
/*
	Functionality for searching for users and patterns.
*/

var con = require('./database.js').connection;

module.exports = {

	/*	Search the users table, matching name against given query.
		Empty query returns full table */
	searchUsers: function(query, limit, cb) {
		// ensure limit exists & is positive
		if (limit && limit > 0) {
			// add wildcard to search query to broaden search
			var query = query == "" ? query : query + "*";

			// select all users who match against query
			con.query('SELECT name, bio, userRank, MATCH (name) AGAINST (? IN BOOLEAN MODE) AS termScore FROM users WHERE MATCH (name) AGAINST (? IN BOOLEAN MODE) OR ? = "" ORDER BY termScore DESC LIMIT ?;', [query, query, query, limit], function(err, rows) {
				if (!err && rows !== undefined) {
					cb(err, rows);
				} else {
					cb(err || "The system was unable to retrieve user search results.");
				}
			});
		} else {
			cb("Invalid results limit given for user search.");
		}
	},

	/*	Searches the patterns table, matching name & description against the given query. 
		If numObjects given, filter to include only patterns with that number of objects. 
		Empty query returns full table */
	searchPatterns: function(query, numObjects, limit, cb) {

	},

	// get the maximum difficulty value out of all existing patterns
	getMaxDifficulty: function(cb) {

	},

	// scale a difficulty out of 10
	scaleOutOfTen(maxDifficulty, difficulty) {
		return 10 * (difficulty) / maxDifficulty;
	}

}


// module.exports.searchUsers('', -1, function(err, users) {
// 	if (err) throw err;
// 	console.log(users);
// });