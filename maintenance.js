
/*
	Functionality for performing basic table maintenance.
*/

var con = require('./database.js').connection;

module.exports = {
	/*
	Admin:addUser(name, email, isAdmin, bio, cb)
	Adds a new user account, with the given info (google sign-in for first time too)

	User:editUser(uid, bio, cb)
		Edits only the bio of the user because everything else is not mutable.

	Admin:changeAdminStatus(userUID, isAdmin, cb)
		Changes the admins status based on a 0,1 value.

	Admin:removeUser(uid, cb)
		Deletes a user account.

	Admin:addPattern(name, description, numObjects, gif, cb)
		Adds a new juggling pattern to the patterns table

	Admin:editPattern(uid, name, description, numObjects, gif, cb)
		Edits all fields of pattern.

	Admin:removePattern(uid, cb)
	Deletes the pattern (make hard to do)


	User:addRecord(userUID, patternUID, catches, duration, timeRecorded, video, cb)
		Adds a record linking a given user and pattern.

	User:editRecord(uid, patternUID, catches, duration, video, cb)
		Edit the pattern, number of catches, duration, or video link of one of your records. 

	User:removeRecord(uid, cb)
		Remove an existing record by UID
		*/


	// adds a new juggling pattern to the patterns table
	addPattern: function(name, description, numObjects, gif, cb) {
		// ensure name & number of objects exist
		if (name && numObjects && numObjects > 0) {
			// run insert query
			con.query('INSERT INTO patterns (timeCreated, name, description, numObjects, GIF) VALUES (NOW(), ?, ?, ?, ?);', [name, description, numObjects, gif], function(err) {
				cb(err);
			});
		} else {
			// error on insufficient fields
			cb("All required pattern fields must be filled out.");
		}
	},

	// edits all fields of an existing pattern
	editPattern: function(uid, name, description, numObjects, gif, cb) {
		// ensure name & number of objects exist
		if (name && numObjects && numObjects > 0) {
			// run update query on specific pattern
			con.query('UPDATE patterns SET name = ?, description = ?, numObjects = ?, GIF = ? WHERE uid = ?;', [name, description, numObjects, gif, uid], function(err) {
				cb(err);
			});
		} else {
			// error on insufficient fields
			cb("All required pattern fields must be filled out.");
		}
	},

	// deletes an existing pattern and all associated records
	removePattern: function(uid, cb) {
		// remove the pattern from patterns table
		con.query('DELETE FROM patterns WHERE uid = ?;', [uid], function(err) {
			if (!err) {


				// now recalc user score, and update global rankings. (this should be its own function)


			} else {
				cb(err);
			}
		});
	}


}