
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

	// edits the bio of an existing user profile
	editBio: function(uid, bio, cb){
		// check whether the uid parameter isn't null
		if (uid && uid > 0) {
			//change the user's bio
			con.query('UPDATE users SET bio = ? WHERE uid = ?;', [bio, uid], function(err){
				// callback on the sql error
				cb(err);
			});
		}
		// if the uid is null or negative then callback the error.
		else {
			cb("Unable to edit user, invalid identifier given.");
		}
	},

	// Changes the admins status based on a 0,1 value.	
	changeAdminStatus: function(userUID, isAdmin, cb){
		//ensure userUID and isAdmin exist
		if(userUID != undefined && isAdmin != undefined && isAdmin >= 0 && isAdmin <= 1){
			//change the admin status of the user
			con.query('UPDATE users SET isAdmin = ? WHERE uid = ?;', [isAdmin, userUID], function(err){
				cb(err);
			});

		}else{
			cb("Unable to change admin status, as insufficient identifier or admin status information given.");
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
	// // edits all fields of an existing pattern
	// editPattern: function(uid, name, description, numObjects, gif, cb) {
	// 	// ensure name & number of objects exist
	// 	if (name && numObjects && numObjects > 0) {
	// 		// run update query on specific pattern
	// 		con.query('UPDATE patterns SET name = ?, description = ?, numObjects = ?, GIF = ? WHERE uid = ?;', [name, description, numObjects, gif, uid], function(err) {
	// 			cb(err);




	// 			// but this could cause changes too






	// 		});
	// 	} else {
	// 		// error on insufficient fields
	// 		cb("All required pattern fields must be filled out.");
	// 	}
	// },

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// // deletes an existing pattern and all associated records
	// removePattern: function(uid, cb) {
	// 	// remove the pattern from patterns table
	// 	con.query('DELETE FROM patterns WHERE uid = ?;', [uid], function(err) {
	// 		if (!err) {


	// 			// now recalc user score, and update global rankings. (this should be its own function)


	// 		} else {
	// 			cb(err);
	// 		}
	// 	});
	// }

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// adds a record linking a given user and pattern
	addRecord: function(userUID, patternUID, catches, duration, timeRecorded, video, cb) {

	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// edit the pattern, number of catches, duration, or video link of one of your records. 
	editRecord: function(uid, patternUID, catches, duration, video, cb) {

	},

	//----------------------------------//
	//		NEEDS IMPLEMENTATION		//
	//----------------------------------//
	// remove an existing record by UID
	removeRecord: function(uid, cb) {

	}

}