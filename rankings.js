
/*
	Functionality dealing with user rankings.
*/

var con = require('./database.js').connection;

module.exports = {

	// calculate global user scores on a subset of users, or all users if no subset specified
	calcUserScores: function(userUIDs, cb) {
		// query constraint to limit records to subset of users
		var constraint = "";

		// if only calculating for a subset of users
		if (userUIDs && userUIDs.length > 0) {
			constraint = " AND r.userUID IN (" + userUIDs.join(',') + ")";
		}

		// get the score of each users best records,
		con.query('SELECT r.userUID, r.score, p.difficulty as patternDifficulty FROM records r JOIN patterns p ON r.patternUID = p.uid WHERE r.isPersonalBest = 1' + constraint + ' ORDER BY r.userUID;', [], function(err, rows){
			// if there isn't an sql error
			if (!err && rows != undefined){
				// records do exist for these users
				if (rows.length > 0){
					

					// !!!!!!!!!!!!!!
					// MAKE SURE WE USE THE RECORD SCORE OF THIS USER'S MOST RECENT PERSONAL BEST (there are two PB's per event possible, one for catches, one for duration--use the more recent when calculating user score)
					// !!!!!!!!!!!!!!


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



					/*

					Here's my take on the matter:

						userScores = {}

						for each record (userUID, score, difficulty)
							if userScores[userUID] does not exist
								userScores[userUID] = 0

							userScores[userUID] += (record score) * (difficulty)


						query = ""
						insert = []
						for each userUID in userScores object
							add userUID, userScores[userUID] to insert
							add " WHEN uid = ? THEN ?" to query


						if query non-empty, run 'UPDATE users SET score = CASE' + query + ' ELSE score END;'
						
					*/

				} else {
					cb("There are no records from which to calculate user scores.");
				}
			} else {
				cb("There was an error with retrieval of record information.");
			}
		});
	},

	// convert existing user scores into user ranks for all users
	updateGlobalRanks: function(cb) {
		/*
			SELECT score FROM users GROUP BY score ORDER BY score DESC;

				This gets all the possible scores (no duplicates) from the users table, ordered highest to lowest. We simply need to rank them and 
				then UPDATE to add that same rank to any users who share that score.

			insert = []
			query = ''

			for i = 0 to rows.length
				insert.push(rows[i].score, i + 1)
				query += ' WHEN score = ? THEN ?'

			if non-empty query, run 'UPDATE users SET userRank = CASE' + query + ' ELSE userRank END;'

		*/

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

		/*

			'SELECT records.*, TIME_TO_SEC(duration) AS seconds FROM records WHERE isPersonalBest = 1' + constraint + ' ORDER BY patternUID, catches DESC, seconds DESC;''
				This gets all the relevant PB records for these patterns, grouped off by pattern, and within that,
				ordered catch records (best to worst) come first, then ordered duration records (best to worst) (converted to seconds already)

			for i from 0 to records.length
				j = i
				rank = 1

				if records[i].catches NOT null
					while records[j].catches also NOT null:
						records[j].score = records[j].catches / records[i].catches

						if i != j & records[j].score < records[j - 1].score
							rank++
						
						records[j].rank = rank

						j++

				i = j
				rank = 1

				if records[i].seconds NOT null
					while records[j].seconds also NOT null:
						records[j].score = records[j].seconds / records[i].seconds

						if i != j & records[j].score < records[j - 1].score
							rank++
						
						records[j].rank = rank

						j++

				i = j



		*/
	},

	/*	Calculate the difficulties of a subset of patterns, assuming the 
		number of objects and average high scores have been updated already. 
		If no subset given, calculate for all patterns. */
	calcPatternDifficulties: function(patternUIDs, cb) {
		/*
			if pattern UID subset given:
				constraint = " WHERE uid IN (" + patternUIDs.join(',') + ")";

			SELECT uid, numObjects, avgHighScoreCatch, avgHighScoreTime FROM patterns' + constraint + ';'
				This gets what we need from each pattern in subset, or in all patterns.

			get the max average high score for all patterns (getMaxAvgHighScores)

			get the weights for each scoring method for each pattern (getScoringWeights)

			insert = []
			query = ''

			for each pattern in rows

				catchWeight = frequency of catch-based scoring in this pattern
				timeWeight = frequency of time-based scoring in this pattern

				catchDiff = (avgHighScoreCatch) / (max for avgHighScoreCatch)
				timeDiff = (avgHighScoreTime) / (max for avgHighScoreTime)

				relDifficulty = (catchWeight * catchDiff) + (timeWeight * timeDiff)

				difficulty = numObjects * (2 - relDifficulty)
				
				insert.push(uid, difficulty)
				query += " WHEN uid = ? THEN ?"


			Run: 'UPDATE patterns SET difficulty = CASE' + ';'

		*/
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
		/*
			constraint = ""

			if patternUIDs array given
				constraint = " AND patternUID IN (" + patternUIDs.join(',') + ")";

			'SELECT records.*, TIME_TO_SEC(duration) AS seconds FROM records WHERE isPersonalBest = 1' + constraint + ' ORDER BY patternUID;'

			catches = [], catchQuery = ''
			times = [], timeQuery = ''

			for i = 0 to num records
				j = i

				numCatchRecords = 0, catchSum = 0
				numTimeRecords = 0, timeSum = 0

				currentPatternUID = records[i].patternUID

				while records[j].patternUID = currentPatternUID
					
					if records[j].catches is NOT null
						catchSum += records[j].catches
						numCatchRecords++

					else if records[j].time is NOT null
						timeSum += records[j].seconds
						numTimeRecords++

					j++

				i = j
				catches.push(currentPatternUID, numCatchRecords > 0 ? catchSum / numCatchRecords : 0)
				catchQuery += ' WHEN uid = ? THEN ?'

				times.push(currentPatternUID, numTimeRecords > 0 ? timeSum / numTimeRecords : 0)
				timeQuery += ' WHEN uid = ? THEN ?'


			insert = add all of the times array to the END of the catches array

			Run this: 'UPDATE patterns SET avgHighScoreCatch = CASE' + catchQuery + ' ELSE avgHighScoreCatch END, avgHighScoreTime = CASE' + timeQuery + ' ELSE avgHighScoreTime END;'
		*/
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
		representing the weights for that pattern */
	getScoringWeights: function(patternUIDs, cb) {
		/*

		if patternUIDs NOT null
			constraint = " WHERE patternUID IN (" + patternUIDs.join(',') + ")";

		'SELECT patternUID, catches IS NULL AS isTimeRecord, COUNT(*) AS count FROM records' + constraint + ' GROUP BY patternUID, isTimeRecord;'

		uidToMethod = {}
	
		for i = 0 to rows length - 1, i += 2
			total = rows[i].count + rows[i + 1].count

			catch = rows[i].isTimeRecord == 1 ? rows[i + 1] : rows[i];
			time = rows[i].isTimeRecord == 1 ? rows[i] : rows[i + 1];

			uidToMethod[rows[i].patternUID] = {
				catchWeight: catch.count / total
				timeWeight: time.count / total
			}

		callback on uidToMethod
			
		*/
	}

	/*

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
		Determine category (time or catches) of this record.

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

/* randomize user scores */
// var query = "";
// var update = [];

// for (var i = 1; i < 42; i++) {
// 	query += " WHEN uid = ? THEN ?";
// 	update.push(i, Math.random() * 100);
// }

// console.log(query);

// con.query('UPDATE users SET score = CASE' + query + ' ELSE score END;', update, function(err) {
// 	console.log(err);
// });