
/*
	Functionality for performing basic table maintenance.
*/

var con = require('./database.js').connection;
var ranking = require('./rankings.js');

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

	// permanently deletes a user account, and updates all affected ranking data
	removeUser: function(uid, cb) {
		// ensure positive user UID exists
		if (uid && uid > 0) {
			// determine which patterns this user competed in (needs to be queried before removal of user's records)
			ranking.affectedPatternsByUser([uid], function(err, affectedPatterns) {
				if (!err) {
					// remove user and all of their records
					con.query('DELETE FROM users WHERE uid = ?;', [uid], function(err) {
						if (!err) {
							// keep all affected pattern data up to date
							ranking.maintainPatternInfo(affectedPatterns, cb);
						} else {
							cb(err);
						}
					});
				} else {
					cb(err);
				}
			});
		} else {
			cb("Unable to remove user as invalid identifier given.");
		}
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
	editPattern: function(uid, name, numObjects, description, gif, cb) {
		// ensure required fields are defined
		if (uid && uid > 0 && name && numObjects) {
			// get old number of objects to determine change
			con.query('SELECT numObjects FROM patterns WHERE uid = ?;', [uid], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					var oldNumObjects = rows[0].numObjects;

					// apply updates in patterns table
					con.query('UPDATE patterns SET name = ?, numObjects = ?, description = ?, GIF = ? WHERE uid = ?;', [name, numObjects, description, gif, uid], function(err) {
						if (!err) {
							// if change in pattern's number of objects
							if (oldNumObjects != numObjects) {
								// get all users whose scores are affected by this change in difficulty
								ranking.affectedUsersByPattern([uid], function(err, affectedUsers) {
									if (!err) {
										// handle change in pattern difficulty & manage ripple effect
										ranking.handlePatternDifficultyChange([uid], affectedUsers, cb);
									} else {
										cb(err);
									}
								});
							// no difficulty / scoring updating required
							} else {
								cb(err);
							}

						} else {
							cb(err);
						}
					});

				} else {
					cb(err || "Unable to determine change in pattern's number of objects.");
				}
			});
		} else {
			cb("Unable to edit pattern as not all required fields (UID, name, number of objects) were present.");
		}
	},

	// deletes an existing pattern and all associated records
	removePattern: function(uid, cb) {
		// get users whose scores are affected by this pattern (relies on records, so we have to query this before deleting the pattern)
		ranking.affectedUsersByPattern([uid], function(err, affectedUsers) {
			// remove pattern from patterns table & delete all associated records
			con.query('DELETE FROM patterns WHERE uid = ?;', [uid], function(err) {
				if (!err) {
					// recalculate user scores for these users, without this pattern
					ranking.calcUserScores(affectedUsers, function(err) {
						if (!err) {
							// update the global rankings accordingly
							ranking.updateGlobalRanks(cb);
						} else {
							cb(err);
						}
					});
				} else {
					cb(err);
				}
			});
		});
	},

	// adds a record linking a given user and pattern
	addRecord: function(userUID, patternUID, catches, duration, video, cb) {
		// ensure required fields exist (and that only one of catches or duration is defined)
		if (userUID && userUID > 0 && patternUID && patternUID > 0 && (catches || duration) && !(catches && duration)) {
			// add new record with given fields
			con.query('INSERT INTO records (userUID, patternUID, catches, duration, video, timeRecorded) VALUES (?, ?, ?, ?, ?, NOW());', [userUID, patternUID, catches, duration, video], function(err) {
				if (!err) {
					// handle the change in records appropriately
					ranking.handleRecordChange(userUID, [patternUID], cb);
				} else {
					cb(err);
				}
			});
		} else {
			cb("Failed to add new record as not all required fields (user UID, pattern UID, catch score or time score) were defined.");
		}
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
			Determine pattern UID of pattern of the record to remove
			handleRecordChange([patternUID])
		*/
	},

}