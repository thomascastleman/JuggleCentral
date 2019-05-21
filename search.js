
/*
	Functionality for searching for users and patterns.
*/

var con = require('./database.js').connection;

module.exports = {

	/*	Search the users table, matching name against given query.
		Empty query returns full table */
	searchUsers: function(query, limit, cb) {
		// determine what to limit by, if anything
		var limitQuery = (limit && limit > 0) ? " LIMIT ?" : "";

		// add wildcard to search query to broaden search
		var query = query == "" ? query : query + "*";

		// add limit as argument to query if given
		var args = [query, query, query];
		if (limitQuery != "") args.push(limit);

		// select all users who match against query
		con.query('SELECT name, bio, userRank, MATCH (name) AGAINST (? IN BOOLEAN MODE) AS termScore FROM users WHERE MATCH (name) AGAINST (? IN BOOLEAN MODE) OR ? = "" ORDER BY termScore DESC' + limitQuery + ';', args, function(err, rows) {
			if (!err && rows !== undefined) {
				cb(err, rows);
			} else {
				cb(err || "The system was unable to retrieve user search results.");
			}
		});
	},

	// counts the number of possible search results for a user search query
	searchUsersCOUNT: function(query, cb) {
		// add wildcard to search query to broaden search
		var query = query == "" ? query : query + "*";

		// count all users who match against query
		con.query('SELECT COUNT(*) AS count FROM users WHERE MATCH (name) AGAINST (? IN BOOLEAN MODE) OR ? = "" ORDER BY MATCH (name) AGAINST (? IN BOOLEAN MODE) DESC;', [query, query, query], function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// callback on count of results
				cb(err, rows[0].count);
			} else {
				cb(err || "The system was unable to count user search results.");
			}
		});
	},

	/*	Searches the patterns table, matching name & description against the given query. 
		If numObjects given, filter to include only patterns with that number of objects. 
		Empty query returns full table */
	searchPatterns: function(query, numObjects, limit, cb) {
		// ensure limit exists and that numObjects is positive if given
		if (!numObjects || numObjects > 0) {
			// determine what to limit by, if anything
			var limitQuery = (limit && limit > 0) ? " LIMIT ?" : "";

			// add wildcard to search query to broaden search
			var query = query == "" ? query : query + "*";

			// determine if we should filter by number of objects
			var notFiltering = numObjects == undefined;

			// if limiting query, add limit to arguments
			var args = [query, query, query, numObjects, notFiltering];
			if (limitQuery != "") args.push(limit);

			// select all patterns that match against query
			con.query('SELECT name, description, numObjects, GIF, difficulty, MATCH (name, description) AGAINST (? IN BOOLEAN MODE) AS termScore FROM patterns WHERE (MATCH (name, description) AGAINST (? IN BOOLEAN MODE) OR ? = "") AND (numObjects = ? OR ?) ORDER BY termScore DESC' + limitQuery + ';', args, function(err, patterns) {
				if (!err && patterns !== undefined) {
					// determine the maximum difficulty out of all patterns
					con.query('SELECT MAX(difficulty) AS max FROM patterns;', function(err, rows) {
						if (!err && rows !== undefined && rows.length > 0) {
							var maxDiff = rows[0].max;

							// scale all difficulties out of 10
							for (var i = 0; i < patterns.length; i++) {
								patterns[i].difficulty = 10 * patterns[i].difficulty / maxDiff;
							}

							// callback on patterns array
							cb(err, patterns);
						} else {
							cb(err);
						}
					});
				} else {
					// error on querying for search results
					cb(err || "The system was unable to retrieve pattern search results.");
				}
			})
		} else {
			// error on the number of objects filter
			cb("Invalid number of objects filter given.");
		}
	},

	// counts the number of possible search results for a pattern search query
	searchPatternsCOUNT: function(query, numObjects, cb) {
		// ensure limit exists and that numObjects is positive if given
		if (!numObjects || numObjects > 0) {
			// add wildcard to search query to broaden search
			var query = query == "" ? query : query + "*";

			// determine if we should filter by number of objects
			var notFiltering = numObjects == undefined;

			// count number of patterns that match against query
			con.query('SELECT COUNT(*) AS count FROM patterns WHERE (MATCH (name, description) AGAINST (? IN BOOLEAN MODE) OR ? = "") AND (numObjects = ? OR ?) ORDER BY MATCH (name, description) AGAINST (? IN BOOLEAN MODE) DESC;', [query, query, numObjects, notFiltering, query], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					// callback on count
					cb(err, rows[0].count);
				} else {
					// error on querying for search results
					cb(err || "The system was unable to count pattern search results.");
				}
			})
		} else {
			// error on the number of objects filter
			cb("Invalid number of objects filter given.");
		}
	}

}