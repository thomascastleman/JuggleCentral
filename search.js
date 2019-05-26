
/*
	Functionality for searching for users and patterns.
*/

var con = require('./database.js').connection;

module.exports = {

	/*	Search the users table, matching name against given query.
		Empty query returns full table */
	searchUsers: function(query, orderBy, limit, cb) {
		// determine what to limit by, if anything
		var limitQuery = (limit && limit > 0) ? " LIMIT ?" : "";

		// add wildcard to search query to broaden search
		var query = query == "" ? query : query + "*";

		// add limit as argument to query if given
		var args = [query, query, query];
		if (limitQuery != "") args.push(limit);

		// select all users who match against query
		con.query('SELECT name, bio, userRank, score, MATCH (name) AGAINST (? IN BOOLEAN MODE) AS termScore FROM users WHERE MATCH (name) AGAINST (? IN BOOLEAN MODE) OR ? = "" ORDER BY termScore DESC' + limitQuery + ';', args, function(err, rows) {
			if (!err && rows !== undefined) {
				// if a specific order requested
				if (orderBy) {
					switch (orderBy) {
						// compare on the basis of user rank
						case 'RANK':
							compare = function(a, b) {
								return a.userRank - b.userRank;
							}
							break;
					}

					// sort with the specified comparator
					rows.sort(compare);
				}

				// callback on query results
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
		Empty query returns full table 
		If orderBy given, use this to order the results that match against the query. 
		OrderBy can be: 'DIFFICULTY', 'NUM_OBJECTS', 'POPULARITY', or null to order by relevance */
	searchPatterns: function(query, numObjects, orderBy, limit, cb) {
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
			con.query('SELECT uid, name, description, numObjects, GIF, difficulty, MATCH (name, description) AGAINST (? IN BOOLEAN MODE) AS termScore FROM patterns WHERE (MATCH (name, description) AGAINST (? IN BOOLEAN MODE) OR ? = "") AND (numObjects = ? OR ?) ORDER BY termScore DESC' + limitQuery + ';', args, function(err, patterns) {
				if (!err && patterns !== undefined) {

					// get number of users that participate in each pattern
					con.query('SELECT patternUID, COUNT(*) AS numUsers FROM (SELECT * FROM records GROUP BY userUID, patternUID ORDER BY patternUID) AS x GROUP BY patternUID;', function(err, rows) {
						if (!err && rows !== undefined) {
							var uidToPopularity = {};

							// map pattern UID to its number of participants
							for (var i = 0; i < rows.length; i++) {
								uidToPopularity[rows[i].patternUID] = rows[i].numUsers;
							}

							// determine the maximum difficulty out of all patterns
							con.query('SELECT MAX(difficulty) AS max FROM patterns;', function(err, rows) {
								if (!err && rows !== undefined && rows.length > 0) {
									var maxDiff = rows[0].max;

									for (var i = 0; i < patterns.length; i++) {
										// scale all difficulties out of 10 (human-readable)
										patterns[i].difficulty = 10 * patterns[i].difficulty / maxDiff;

										// round off difficulty
										patterns[i].difficulty = patterns[i].difficulty.toFixed(2);

										// add number of users to pattern object
										patterns[i].numUsers = uidToPopularity[patterns[i].uid];

										// default undefined values to no participants
										if (patterns[i].numUsers == undefined) patterns[i].numUsers = 0;
									}

									// comparator function used to sort results
									var compare;

									// if a specific ordering requested
									if (orderBy) {
										switch (orderBy) {
											// compare on the basis of pattern difficulty
											case 'DIFFICULTY':
												compare = function(a, b) {
													return b.difficulty - a.difficulty;
												}
												break;
											// compare on the basis of number of objects
											case 'NUM_OBJECTS':
												compare = function(a, b) {
													return b.numObjects - a.numObjects;
												}
												break;
											// compare on the basis of number of participants
											case 'POPULARITY':
												compare = function(a, b) {
													return b.numUsers - a.numUsers;
												}
												break;
										}

										// sort with the specified comparator
										patterns.sort(compare);
									}

									// callback on patterns array
									cb(err, patterns);
								} else {
									cb(err || "The system failed to determine the most difficult pattern.");
								}
							});
						} else {
							cb(err || "The system was unable to determine each pattern's popularity");
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