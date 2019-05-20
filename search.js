
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
		// ensure limit exists and that numObjects is positive if given
		if (limit && limit > 0 && (!numObjects || numObjects > 0)) {
			// add wildcard to search query to broaden search
			var query = query == "" ? query : query + "*";

			// determine if we should filter by number of objects
			var notFiltering = numObjects == undefined;

			// select all patterns that match against query
			con.query('SELECT name, description, numObjects, GIF, difficulty, MATCH (name, description) AGAINST (? IN BOOLEAN MODE) AS termScore FROM patterns WHERE (MATCH (name, description) AGAINST (? IN BOOLEAN MODE) OR ? = "") AND (numObjects = ? OR ?) ORDER BY termScore DESC LIMIT ?;', [query, query, query, numObjects, notFiltering, limit], function(err, patterns) {
				if (!err && patterns !== undefined) {
					// determine the maximum difficulty out of all patterns
					con.query('SELECT MAX(difficulty) AS max FROM patterns;', function(err, rows) {
						if (!err && rows !== undefined && rows.length > 0) {
							var maxDiff = rows[0].max;

							// scale all difficulties out of 10
							for (var i = 0; i < patterns.length; i++) {
								console.log(patterns[i].difficulty);
								patterns[i].difficulty = 10 * patterns[i].difficulty / maxDiff;
							}

							// callback on patterns array
							cb(err, patterns);
						} else {
							cb(err);
						}
					});
				} else {
					cb(err || "The system was unable to retrieve pattern search results.");
				}
			})
		} else {
			cb("Invalid results limit or number of objects filter given.");
		}
	}

}