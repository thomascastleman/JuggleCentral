
/*
	Functionality dealing with user rankings.
*/

var con = require('./database.js').connection;
var sys = require('./settings.js');

module.exports = {

	// calculate global user scores on a subset of users, or all users if no subset specified
	calcUserScores: function(userUIDs, cb) {
		// query constraint to limit records to subset of users
		var constraintA = "", constraintB = "";

		// if only calculating for a subset of users
		if (userUIDs && userUIDs.length > 0) {
			constraintA = " AND uid IN (" + userUIDs.join(',') + ")";
			constraintB = " AND r.userUID IN (" + userUIDs.join(',') + ")";
		}

		// reset user score of all affected users to 0 before updating, to ensure updates are applied even to those who have no records
		con.query('UPDATE users SET score = 0 WHERE 1 = 1' + constraintA + ';', function(err) {
			if (!err) {
				/*	This gets all of each user's PB records (both catches and time, so we'll have to choose the most recent), 
					ordered by user, pattern UID, and timeRecorded so the first in the pair of max 2 records per pattern will
					be the more recent one. */
				con.query('SELECT r.userUID, r.score, r.timeRecorded, p.uid AS patternUID, p.difficulty as patternDifficulty FROM records r JOIN patterns p ON r.patternUID = p.uid WHERE r.isPersonalBest = 1' + constraintB + ' ORDER BY r.userUID, patternUID ASC, timeRecorded DESC;', [], function(err, records){
					// if there isn't an sql error
					if (!err && records != undefined) {
							/*
								this will add up all of the user's scores and then insert them into the db.
								
								var userScores = {};
								var insertQuery = "";
								var insertVALUES = [];
								var curUserUID = 0;

								for each record
									if userUID associated with this record does not equal the curUserUID
										if userScores[curUserUID] exists
											insertQuery += "WHEN uid = ? THEN ? "
											insertValues.push(curUserUID, userScores[curUserUID]);
								     update the curUserUID to the userUID associated with this record
										userScores[the new userUID] = 0
								
									userScores[the userUID associated with that record] += (record's score * record's associated pattern's difficulty)

								con.query('UPDATE users SET score = CASE ' + insertQuery + 'ELSE score END;', [insertValues], function(err){
									cb(err);
								});
							*/

						// mapping from user UID to user score
						var userScores = {};

						// for each record, add the record score of most recent PB to user score
						for (var i = 0; i < records.length; i++) {
							// if no score in userScores mapping yet, default to 0
							if (userScores[records[i].userUID] == null) {
								userScores[records[i].userUID] = 0;
							}

							// user score = (record score) * (pattern difficulty)
							userScores[records[i].userUID] += records[i].score * records[i].patternDifficulty;

							// if next record exists and is from same pattern
							if (i + 1 < records.length && records[i + 1].patternUID == records[i].patternUID) {
								i++;	// skip the next record, as it's for the same pattern but is less recent than this one
							}
						}

						var query = "";
						var args = [];

						// for each user for which we calculated an updated score
						for (var userUID in userScores) {
							if (userScores.hasOwnProperty(userUID)) {
								// add user UID, user score to query arguments 
								args.push(userUID, userScores[userUID] * sys.userScoreScalingFactor);

								// build query
								query += " WHEN uid = ? THEN ?";
							}
						}

						// if something to update
						if (args.length > 0) {
							// apply updates in DB
							con.query('UPDATE users SET score = CASE' + query + ' ELSE score END;', args, function(err) {
								cb(err);
							});
						} else {
							cb(err);
						}
					} else {
						cb("There was an error with retrieval of record information.");
					}
				});
			} else {
				cb(err || "Unable to reset user scores to 0 before updating.");
			}
		});
	},

	// convert existing user scores into user ranks for all users
	updateGlobalRanks: function(cb) {
		/*	This gets all the possible scores (no duplicates) from the users table, ordered highest to lowest. We simply need to rank them and 
			then UPDATE to add that same rank to any users who share that score. */
		con.query('SELECT score FROM users GROUP BY score ORDER BY score DESC;', function(err, rows) {
			if (!err && rows !== undefined) {
				var args = [];
				var query = '';

				// give each score a rank
				for (var i = 0; i < rows.length; i++) {
					args.push(rows[i].score, i + 1);
					query += ' WHEN score = ? THEN ?';
				}

				// if there is something to update
				if (query != '') {
					// update the user ranks accordingly, giving each user the rank that corresponds with their score
					con.query('UPDATE users SET userRank = CASE' + query + ' ELSE userRank END;', args, function(err) {
						cb(err);
					});
				} else {
					cb(err);
				}
			} else {
				cb(err || "Unable to determine all possible user scores.");
			}
		});
	},

	/*	Calculate the record scores for all PB records within a given subset of patterns,
		and update the local rank of each record */
	updateRecordScoresAndLocalRanks: function(patternUIDs, cb) {
		// query constraint to limit records to subset of patterns
		var constraint = "";

		// if only calculating for a subset of patterns
		if (patternUIDs && patternUIDs.length > 0) {
			constraint = " AND patternUID IN (" + patternUIDs.join(',') + ")";
		}

		/*	This gets all the relevant PB records for these patterns, grouped off by pattern, and within that,
			ordered catch records (best to worst) come first, then ordered duration records (best to worst) (converted to seconds already) */
		con.query('SELECT records.*, TIME_TO_SEC(duration) AS seconds FROM records WHERE isPersonalBest = 1' + constraint + ' ORDER BY patternUID, catches DESC, seconds DESC;', function(err, records) {
			if (!err && records !== undefined) {
				// arguments & query constraints for singular UPDATE query at the end
				var scoreArgs = [], scoreQuery = '';
				var rankArgs = [], rankQuery = '';

				// for each retrieved PB record
				for (var i = 0; i < records.length; i++) {
					var j = i;
					var rank = 1;

					// if this PB is a catch-based record
					if (records[i].catches != null) {
						// while we're still looking at a catch-based record
						while (j < records.length && records[j].catches != null) {
							// compute score as fraction of best catch-based value
							records[j].score = records[j].catches / records[i].catches;

							// store UID and score as UPDATE arguments and add to update query
							scoreArgs.push(records[j].uid, records[j].score);
							scoreQuery += ' WHEN uid = ? THEN ?';

							// if this record has a lower score than the previous, start a new, lower rank
							if (i != j && records[j].score < records[j - 1].score) {
								rank++;
							}

							// add current rank to this record
							records[j].rank = rank;

							// store UID and rank as UPDATE arguments, add to update query 
							rankArgs.push(records[j].uid, records[j].rank);
							rankQuery += ' WHEN uid = ? THEN ?';

							// move to next record
							j++;
						}
					}

					i = j;		// move i past all the catch-based records (if any)
					rank = 1;	// reset the rank  back to 1 for time-based

					// if this record time-based
					if (records[i].seconds != null) {
						// while we're still looking at a time-based record
						while (j < records.length && records[j].seconds != null) {
							// calculate score as fraction of best time score
							records[j].score = records[j].seconds / records[i].seconds;

							// store UID and score as UPDATE args, add to update query
							scoreArgs.push(records[j].uid, records[j].score);
							scoreQuery += ' WHEN uid = ? THEN ?';

							// if this record has a lower score than the previous, start a new, lower rank
							if (i != j && records[j].score < records[j - 1].score) {
								rank++;
							}

							// store rank in record
							records[j].rank = rank;

							// store UID and rank as UPDATE args, add to query
							rankArgs.push(records[j].uid, records[j].rank);
							rankQuery += ' WHEN uid = ? THEN ?';

							// move to next record
							j++;
						}
					}

					// move i to 1 before the last record we were looking at (so that when the loop increments i, we will be at the start of a new pattern)
					i = j - 1;
				}

				// add rank arguments to end of score args array
				var update = scoreArgs.concat(rankArgs);

				// if there are any updates to make
				if (update.length > 0) {
					// apply updates to record scores & ranks
					con.query('UPDATE records SET score = CASE' + scoreQuery + ' ELSE score END, recordRank = CASE' + rankQuery + ' ELSE recordRank END;', update, function(err) {
						cb(err);
					});
				} else {
					cb(err);
				}
			} else {
				cb(err || "Unable to retrieve personal best record information for calculating record scores.");
			}
		});
	},

	/*	Calculate the difficulties of a subset of patterns, assuming the 
		number of objects and average high scores have been updated already. 
		If no subset given, calculate for all patterns.
		ASSUMES stored average high scores are up to date. */
	calcPatternDifficulties: function(patternUIDs, cb) {
		var constraint = "";

		// if pattern subset specified, add query constraint to just those UIDs
		if (patternUIDs && patternUIDs.length > 0) {
			constraint = " WHERE uid IN (" + patternUIDs.join(',') + ")";
		}

		// get necessary pattern info for calculating difficulty
		con.query('SELECT uid, numObjects, avgHighScoreCatch, avgHighScoreTime FROM patterns' + constraint + ';', function(err, rows) {
			if (!err && rows !== undefined) {
				// get the current max average high scores across ALL patterns
				module.exports.getMaxAvgHighScores(function(err, maxAvgCatch, maxAvgTime) {
					if (!err) {
						// get the scoring weights for each pattern in subset
						module.exports.getScoringWeights(patternUIDs, function(err, idToWeights) {
							if (!err) {
								var update = [];
								var query = '';

								// for each pattern
								for (var i = 0; i < rows.length; i++) {
									// get associated weights
									var w = idToWeights[rows[i].uid];

									// default to empty weights if no records exist for that pattern
									if (!w) w = { catchWeight: 0, timeWeight: 0 };
									
									// determine relative difficulty of pattern for each scoring method
									var catchDifficulty = maxAvgCatch > 0 ? rows[i].avgHighScoreCatch / maxAvgCatch : 0;
									var timeDifficulty = maxAvgTime > 0 ? rows[i].avgHighScoreTime / maxAvgTime : 0;

									// compute weighted average of two relative difficulties to get overall relative difficulty
									var relDifficulty = (w.catchWeight * catchDifficulty) + (w.timeWeight * timeDifficulty);

									// compute actual difficulty as number of objects scaled up by relative difficulty (only if rel. difficulty non-zero)
									var difficulty = rows[i].numObjects;
									if (relDifficulty > 0) difficulty *= (2 - relDifficulty);

									// add UID and difficulty to update params, extend update query
									update.push(rows[i].uid, difficulty);
									query += " WHEN uid = ? THEN ?";
								}

								// update pattern difficulties accordingly
								con.query('UPDATE patterns SET difficulty = CASE' + query + ' ELSE difficulty END;', update, function(err) {
									cb(err);
								});
							} else {
								// error getting weights for scoring methods
								cb(err);
							}
						});
					} else {
						// error determining max averages
						cb(err);
					}
				});
			} else {
				// error retrieving pattern data
				cb(err || "Unable to retrieve pattern metadata to calculate difficulties.");
			}
		});
	},

	// determine the UIDs of all patterns affected by a subset of users (which patterns do they have records in)
	affectedPatternsByUser: function(userUIDs, cb) {
		// default to no affected patterns if no subset given
		if (!userUIDs || userUIDs.length == 0) {
			cb(null, []);
		} else {
			// join user UIDs into comma-separated string
			var setOfUsers = userUIDs.join(',');

			// get patternUID of all the records owned by these users, grouped so each pattern only appears once
			con.query('SELECT patternUID FROM records WHERE userUID IN (' + setOfUsers + ') GROUP BY patternUID;', function(err, rows) {
				if (!err && rows !== undefined) {
					var patterns = [];

					// transfer row objects into a list of UIDs
					for (var i = 0; i < rows.length; i++) {
						patterns.push(rows[i].patternUID);
					}

					// callback on list of pattern UIDs
					cb(err, patterns);
				} else {
					// callback on query error
					cb(err || "Unable to determine the patterns affected by the given set of users.");
				}
			});
		}
	},

	// determine the UIDs of users who compete in a given pattern
	affectedUsersByPattern: function(patternUIDs, cb) {
		// default to no affected users if no subset given
		if (!patternUIDs || patternUIDs.length == 0) {
			cb(null, []);
		} else {
			// join pattern UIDs into comma-separated string
			var setOfPatterns = patternUIDs.join(',');

			// get userUID of all records referencing these patterns, grouped so each user only appears once
			con.query('SELECT userUID FROM records WHERE patternUID IN (' + setOfPatterns + ') GROUP BY userUID;', function(err, rows) {
				if (!err && rows !== undefined) {
					var users = [];

					// transfer row objects into a list of UIDs
					for (var i = 0; i < rows.length; i++) {
						users.push(rows[i].userUID);
					}

					// callback on list of user UIDs
					cb(err, users);
				} else {
					// callback on query error
					cb(err || "Unable to determine the users affected by the given set of patterns.");
				}
			});
		}
	},

	/*	Recalculate and store the average personal best for time and catches for a given subset of patterns.
		If no subset given, will update average PB scores for all patterns. */
	updateAvgHighScores: function(patternUIDs, cb) {
		var constraintA = "", constraintB = "";

		// if pattern subset given, add constraints to queries
		if (patternUIDs && patternUIDs.length > 0) {
			constraintA = " WHERE uid IN (" + patternUIDs.join(',') + ")";
			constraintB = " AND patternUID IN (" + patternUIDs.join(',') + ")";
		}

		// reset all affected pattern averages to 0, so that even patterns which have no records are still updated
		con.query('UPDATE patterns SET avgHighScoreCatch = 0, avgHighScoreTime = 0' + constraintA + ';', function(err) {
			if (!err) {
				// select all personal bests from these patterns, sectioned by pattern
				con.query('SELECT records.*, TIME_TO_SEC(duration) AS seconds FROM records WHERE isPersonalBest = 1' + constraintB + ' ORDER BY patternUID;', function(err, rows) {
					if (!err && rows !== undefined) {
						var catches = [], catchQuery = '';
						var times = [], timeQuery = '';

						// for each personal best
						for (var i = 0; i < rows.length; i++) {
							var j = i;

							// variables for computing average score at each pattern
							var numCatchRecords = 0, catchSum = 0;
							var numTimeRecords = 0, timeSum = 0;

							// get pattern UID of the record we're looking at
							var currentPatternUID = rows[i].patternUID;

							// while looking at records under this pattern
							while (j < rows.length && rows[j].patternUID == currentPatternUID) {
								// if record is catch-based
								if (rows[j].catches != null) {
									// add to sum, increment number of catch-based records
									catchSum += rows[j].catches;
									numCatchRecords++;

								// if record time-based
								} else if (rows[j].seconds != null) {
									// add to sum, increment number of time-based records
									timeSum += rows[j].seconds;
									numTimeRecords++;
								}

								// move to next record
								j++;
							}

							// move i to where we left off with j
							i = j;

							// update catch average for this pattern, add to update params
							catches.push(currentPatternUID, numCatchRecords > 0 ? catchSum / numCatchRecords : 0);
							catchQuery += ' WHEN uid = ? THEN ?';

							// update time average for this pattern, add to update params
							times.push(currentPatternUID, numTimeRecords > 0 ? timeSum / numTimeRecords : 0);
							timeQuery += ' WHEN uid = ? THEN ?';
						}

						// add all update parameters to one array
						var updates = catches.concat(times);

						// if there are new values to update to
						if (updates.length > 0) {
							// apply updates to averages across affected patterns
							con.query('UPDATE patterns SET avgHighScoreCatch = CASE' + catchQuery + ' ELSE avgHighScoreCatch END, avgHighScoreTime = CASE' + timeQuery + ' ELSE avgHighScoreTime END;', updates, function(err) {
								cb(err);
							});
						} else {
							// callback without updating anything since no updates needed
							cb(err);
						}
					} else {
						// error retrieving PB records
						cb(err || "Unable to retrieve personal best information for the given patterns.");
					}
				});
			} else {
				// error on failure to reset before updating
				cb(err || "Failed to reset pattern averages to 0.");
			}
		});
	},

	// get the current max average high score values for both time and catches across all patterns
	getMaxAvgHighScores: function(cb) {
		// use SQL to get the max averages
		con.query('SELECT MAX(avgHighScoreCatch) AS maxAvgCatch, MAX(avgHighScoreTime) AS maxAvgTime FROM patterns;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				// callback on both values
				cb(err, rows[0].maxAvgCatch, rows[0].maxAvgTime);
			} else {
				cb(err || "Unable to retrieve maximum average personal best values from patterns.");
			}
		});
	},

	/*	Determine the relative frequencies of each scoring method (catch- and time-based) for a given subset of patterns
		Calls back on a mapping from pattern UID to an object of the form { timeWeight: <float>, catchWeight: <float> }
		representing the weights for that pattern.
		If a pattern UID maps to null, assume to use weights of 0 for that pattern. */
	getScoringWeights: function(patternUIDs, cb) {
		var constraint = "";

		// if subset of patterns given
		if (patternUIDs && patternUIDs.length > 0) {
			constraint = " WHERE patternUID IN (" + patternUIDs.join(',') + ")";
		}

		// count frequency of catches vs time in each pattern
		con.query('SELECT patternUID, catches IS NULL AS isTimeRecord, COUNT(*) AS count FROM records' + constraint + ' GROUP BY patternUID, isTimeRecord;', function(err, rows) {
			if (!err && rows !== undefined) {
				var uidToWeights = {};

				// look at records in groups of two
				for (var i = 0; i < rows.length - 1; i += 2) {
					// get total number of PB records
					var total = rows[i].count + rows[i + 1].count;

					// get counts for catch- and time-based PB records in this pattern
					var c = rows[i].isTimeRecord == 1 ? rows[i + 1] : rows[i];
					var t = rows[i].isTimeRecord == 1 ? rows[i] : rows[i + 1];

					// update weights to reflect frequency of scoring methods
					uidToWeights[rows[i].patternUID] = {
						catchWeight: c.count / total,
						timeWeight: t.count / total
					};
				}

				// callback on mapping
				cb(err, uidToWeights);
			} else {
				// query error from counting
				cb(err || "Unable to count catch/time frequencies for given patterns.");
			}
		});
	},

	/*	Redetermine the isPersonalBest flag for a given user competing in a given event
		If scoringIsTime, the affected category is time-based scoring, otherwise catch-based */
	maintainPB: function(userUID, patternUID, cb) {
		// ensure valid user and pattern given
		if (userUID && userUID > 0 && patternUID && patternUID > 0) {
			// default all records under this user & pattern to NOT the PB
			con.query('UPDATE records SET isPersonalBest = 0 WHERE userUID = ? AND patternUID = ?;', [userUID, patternUID], function(err) {
				if (!err) {
					// get the personal best records in each scoring method for this user & pattern
					con.query('SELECT * FROM records JOIN (SELECT duration IS NOT NULL AS isTimeBased, catches IS NOT NULL AS isCatchBased, MAX(duration) AS maxDuration, MAX(catches) AS maxCatches FROM records WHERE userUID = ? AND patternUID = ? GROUP BY isTimeBased, isCatchBased) AS x ON (records.duration = x.maxDuration OR records.catches = x.maxCatches) WHERE userUID = ? AND patternUID = ?;', [userUID, patternUID, userUID, patternUID], function(err, rows) {
						if (!err && rows !== undefined) {
							// if there are personal bests to flag
							if (rows.length > 0) {
								var uids = [];

								// add record UIDs (however many) to list of UIDs for UPDATE query
								for (var i = 0; i < rows.length; i++) {
									uids.push(rows[i].uid);
								}

								// convert UID array into comma-separated string
								var constraint = uids.join(',');

								// update the new personal bests accordingly
								con.query('UPDATE records SET isPersonalBest = 1 WHERE uid IN (' + constraint + ');', function(err) {
									cb(err);
								});
							} else {
								cb(err);
							}
						} else {
							cb(err || "Failed to determine the current personal bests for the given user and pattern.");
						}
					});
				} else {
					// failed to reset personal best statuses to 0
					cb(err);
				}
			});
		} else {
			// error lack of requirements
			cb("Unable to maintain the personal best record due to invalid user or pattern given.");
		}
	}


	/*


	-------------------- These will happen within maintenance.js, referencing the funcs from here --------------------

	On Delete User:
		Determine the patterns in which this user competed. Then remove their records. (affectedPatternsByUser & DELETE query)

		Update record scores & local ranks in all patterns they competed in. (updateRecordScoresAndLocalRanks)

		Find the max avg time high score, and max avg catch high score across all patterns. (current maxes) (getMaxAvgHighScores)

		For each of the affected patterns:
			Recalc & store avg high score for both categories. (updateAvgHighScores)

		Find the maxes again, and compare (getMaxAvgHighScores)

		If either of maxes changed in value:
			Recalc difficulties for all patterns (calcPatternDifficulties)
			Recalc all the user scores, use to update global ranks. (calcUserScores & updateGlobalRanks)

		If not:
			Recalc difficulties for all affected patterns. (calcPatternDifficulties with subset)
			Recalc user scores of those who competed in affected patterns. (affectedUsersByPattern with subset of patterns this user affected, calcUserScores with subset)

		Recalc rank for everyone. (updateGlobalRanks)




	On Delete / New Record:
		Maintain personal best for this category in this pattern for this user.

		Recalc record scores in this pattern, use to update ranks in this pattern. (updateRecordScoresAndLocalRanks)

		Find prevMax, the current max avg high score (all patterns) for the same category that this record is in (getMaxAvgHighScores)

		Recalculate avg high score in this pattern for this category, avg, and store in DB. (updateAvgHighScores)

		Find newMax for this category (getMaxAvgHighScores)

			If max changed

				Recalc all pattern difficulties. (calcPatternDifficulties on all)

				Recalc all user scores (calcUserScores on all)


			If max DID NOT change

				Recalc difficulty for only this pattern (calcPatternDifficulties for just this one)

				Recalc user scores for users competing in this pattern (affectedUsersByPattern, and calcUserScores for subset)

			Recalculate global rank for everyone. (updateGlobalRanks)


	On Edit Pattern:
		If numObjects changed: (this changes difficulty of this pattern & therefore the user score of every competing user)
			Recalc THIS pattern's difficulty (everything you need is stored) (calcPatternDifficulties for just this pattern)
			Recalc user score of every user competing in this pattern, and update global rank (affectedUsersByPattern, and calcUserScores for subset, and updateGlobalRanks)



	On Delete Pattern:
		Recalc user scores of affected users, and update all global rank. (affectedUsersByPattern, calcUserScores, updateGlobalRanks)

	*/

}

// testing: calc avg scores, then pattern difficulties, then user scores, then global ranks
// module.exports.updateAvgHighScores([], function(err) {
// 	console.log(err);
// 	module.exports.calcPatternDifficulties([], function(err) {
// 		console.log(err);
// 		module.exports.calcUserScores(null, function(err) {
// 			console.log(err);
// 			module.exports.updateGlobalRanks(function(err) { console.log(err); });
// 		});
// 	});
// });