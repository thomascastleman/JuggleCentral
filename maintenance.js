
/*
	Functionality for performing basic table maintenance.
*/

var con = require('./database.js').connection;
var ranking = require('./ranking.js');

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

	// permanently deletes a user account
	removeUser: function(uid, cb) {
		/*
			Determine the patterns in which this user competed. Then remove their records. (affectedPatternsByUser & DELETE query)

			Update record scores & local ranks in all patterns they competed in. (updateRecordScoresAndLocalRanks)

			Find the max avg time high score, and max avg catch high score across all patterns. (current maxes) (getMaxAvgHighScores)

			Recalc & store avg high scores for affected patterns. (updateAvgHighScores)

			Find the maxes again, and compare (getMaxAvgHighScores)

			If either of maxes changed in value:
				Recalc difficulties for all patterns (calcPatternDifficulties)
				Recalc all the user scores, use to update global ranks. (calcUserScores & updateGlobalRanks)

			If not:
				Recalc difficulties for all affected patterns. (calcPatternDifficulties with subset)
				Recalc user scores of those who competed in affected patterns. (affectedUsersByPattern with subset of patterns this user affected, calcUserScores with subset)

			Recalc rank for everyone. (updateGlobalRanks)
		*/
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

	// edits all fields of an existing pattern
	editPattern: function(uid, name, description, numObjects, gif, cb) {
		/*
			If numObjects changed: (this changes difficulty of this pattern & therefore the user score of every competing user)
				Recalc THIS pattern's difficulty (everything you need is stored) (calcPatternDifficulties for just this pattern)
				Recalc user score of every user competing in this pattern, and update global rank (affectedUsersByPattern, and calcUserScores for subset, and updateGlobalRanks)
		*/
	},

	// deletes an existing pattern and all associated records
	removePattern: function(uid, cb) {
		/*
			Recalc user scores of affected users, and update all global rank. (affectedUsersByPattern, calcUserScores, updateGlobalRanks)
		*/
	},

	// adds a record linking a given user and pattern
	addRecord: function(userUID, patternUID, catches, duration, timeRecorded, video, cb) {
		/*
			Ensure only ONE of catches and duration is defined (error otherwise)
			Determine pattern UID of pattern in which record was added or removed.
			handleRecordChange([patternUID])
		*/
	},

	// edit the contents of one of your records
	editRecord: function(uid, patternUID, catches, duration, video, cb) {
		/*
			IMPORTANT: patternUID, catches, duration,
			non important: video
			
			Ensure only ONE of catches and duration is defined (error)

			If pattern changed:
				affected patterns = [old patternUID, new patternUID]
			otherwise:
				affected patterns = [pattern UID]

			handleRecordChange(affectedPatterns)

		*/
	},

	// remove an existing record by UID
	removeRecord: function(uid, cb) {
		/*
			Determine pattern UID of pattern in which record was added or removed.
			handleRecordChange([patternUID])
		*/
	},

	// used to handle a new / edited / removed record by updating scores & ranks as needed
	handleRecordChange: function(affectedPatterns) {
		/*
			Maintain personal bests in affectedPatterns for this user. (maintainPB)

			Recalc record scores in affectedPatterns, use to update ranks in affectedPatterns. (updateRecordScoresAndLocalRanks)

			Find the current maxes for avg high score across all patterns (getMaxAvgHighScores)

			Recalculate avg high score in affectedPatterns and store in DB. (updateAvgHighScores)

			Find newMax's after this pattern's average recalculations (getMaxAvgHighScores)

				If either max changed

					Recalc all pattern difficulties. (calcPatternDifficulties on all)

					Recalc all user scores (calcUserScores on all)

				If both maxes DID NOT change

					Recalc difficulty for affectedPatterns (calcPatternDifficulties for just this one)

					Recalc user scores for users competing in this pattern (affectedUsersByPattern on affectedPatterns, and calcUserScores for subset)

				Recalculate global rank for everyone. (updateGlobalRanks)
		*/
	}

}