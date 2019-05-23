
/*
	Functionality for performing basic table maintenance.
*/

var con = require('./database.js').connection;

module.exports = {

	// adds a new user to the DB, calls back on the created profile
	addUser: function(name, email, bio, isAdmin, cb){
		// check whether the required fields aren't null
		if(name && email && isAdmin != undefined) {
			// get the score and user rank of the worst ranked existing user
			con.query('SELECT score, userRank FROM users WHERE userRank = (SELECT MAX(userRank) FROM users) LIMIT 1;', function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					var lowestRank = rows[0].userRank, lowestScore = rows[0].score, newUserRank;

					// if lowest ranked user ALSO has 0 score, use same rank for this user
					if (lowestScore == 0) {
						newUserRank = lowestRank;
					} else {
						// if new user has worse score than lowest ranked user, use an even lower rank
						newUserRank = lowestRank + 1;
					}

					// insert user info into the database, and select the generated profile
					con.query('INSERT INTO users (timeCreated, userRank, name, email, bio, isAdmin) VALUES (NOW(), ?, ?, ?, ?, ?); SELECT * FROM users WHERE uid = LAST_INSERT_ID();', [newUserRank, name, email, bio, isAdmin], function(err, rows) {
						if (!err && rows !== undefined && rows.length > 1 && rows[1].length > 0) {
							// callback on new user's profile
							cb(err, rows[1][0]);
						} else {
							// callback on the sql error.
							cb(err || "Failed to add a new user.");
						}
					});
				} else {
					cb(err || "Unable to determine the lowest ranked user to determine new user rank.");
				}
			});
		}
		// if one of the fields is null, callback on error
		else{
			cb("One or more of the required fields to add a user were not filled out correctly.");
		}
	},


	/*	Edit a user's bio or isAdmin status
		If either argument null, do not update that field. */
	editUser: function(uid, bio, isAdmin, cb) {
		// ensure user is identified
		if (uid && uid > 0) {
			// change the user's profile
			con.query('UPDATE users SET bio = CASE WHEN ? IS NOT NULL THEN ? ELSE bio END, isAdmin = CASE WHEN ? IS NOT NULL THEN ? ELSE isAdmin END WHERE uid = ?;', [bio, bio, isAdmin, isAdmin, uid], function(err){
				// callback on the sql error
				cb(err);
			});
		} else {
			cb("Unable to edit user, invalid identifier given.");
		}
	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// permanently deletes a user account
	removeUser: function(uid, cb) {

	},

	// adds a new juggling pattern to the patterns table, calls back on created pattern profile
	addPattern: function(name, description, numObjects, gif, cb) {
		// ensure name & number of objects exist
		if (name && numObjects && numObjects > 0) {
			// run insert query
			con.query('INSERT INTO patterns (timeCreated, name, description, numObjects, GIF) VALUES (NOW(), ?, ?, ?, ?); SELECT * FROM patterns WHERE uid = LAST_INSERT_ID();', [name, description, numObjects, gif], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 1 && rows[1].length > 0) {
					// callback on profile for new pattern
					cb(err, rows[1][0]);
				} else {
					cb(err || "Failed to add new pattern.");
				}
			});
		} else {
			// error on insufficient fields
			cb("All required pattern fields must be filled out.");
		}
	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// edits all fields of an existing pattern
	editPattern: function(uid, name, description, numObjects, gif, cb) {
		// // ensure name & number of objects exist
		// if (name && numObjects && numObjects > 0) {
		// 	// run update query on specific pattern
		// 	con.query('UPDATE patterns SET name = ?, description = ?, numObjects = ?, GIF = ? WHERE uid = ?;', [name, description, numObjects, gif, uid], function(err) {
		// 		cb(err);




		// 		// but this could cause changes too






		// 	});
		// } else {
		// 	// error on insufficient fields
		// 	cb("All required pattern fields must be filled out.");
		// }
	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// deletes an existing pattern and all associated records
	removePattern: function(uid, cb) {
		// // remove the pattern from patterns table
		// con.query('DELETE FROM patterns WHERE uid = ?;', [uid], function(err) {
		// 	if (!err) {


		// 		// now recalc user score, and update global rankings. (this should be its own function)


		// 	} else {
		// 		cb(err);
		// 	}
		// });
	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// adds a record linking a given user and pattern
	addRecord: function(userUID, patternUID, catches, duration, timeRecorded, video, cb) {
		// ensure only ONE of catches and duration is defined
	},

	// edit the contents of one of your records
	editRecord: function(uid, patternUID, catches, duration, video, cb) {
		// if valid UID
		if (uid && uid > 0) {
			// update this record, replacing existing video link
			con.query('UPDATE records SET video = ? WHERE uid = ?;', [video, uid], function(err) {
				cb(err);
			});
		} else {
			cb("Unable to update video link, as invalid record identifier was given.");
		}
	},

	// IMPORTANT: patternUID, catches, duration,
	// non important: video

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// remove an existing record by UID
	removeRecord: function(uid, cb) {

	}

}

/*

-------------------- These will happen within maintenance.js, referencing the funcs from ranking.js --------------------

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

On Edit Record:

	If pattern changed:
		affected patterns = [old patternUID, new patternUID]
	otherwise:
		affected patterns = [pattern UID]

	

handleRecordChange(affectedPatterns)



On Delete / New Record:
	Maintain personal bests in this pattern for this user. (maintainPB)

	Recalc record scores in this pattern, use to update ranks in this pattern. (updateRecordScoresAndLocalRanks)

	Find the current maxes for avg high score across all patterns (getMaxAvgHighScores)

	Recalculate avg high score in this pattern and store in DB. (updateAvgHighScores)

	Find newMax's after this pattern's average recalculations (getMaxAvgHighScores)

		If either max changed

			Recalc all pattern difficulties. (calcPatternDifficulties on all)

			Recalc all user scores (calcUserScores on all)

		If both maxes DID NOT change

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