
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

	addUser: function(name, email, bio, isAdmin, cb){
		//check whether the required fields aren't null
		if(name && email && isAdmin != undefined){
			//insert the information into the database.
			con.query('INSERT INTO users (timeCreated, name, email, bio, isAdmin) VALUES (NOW(), ?, ?, ?, ?);', [name, email, bio, isAdmin], function(err) {
				//callback on the sql error.
				cb(err);
			}
		}
		//if one of the fields is null, callback an error
		else{
			cb("One or more of the required fields were not filled out correctly.");
		}

	},

	editUser: function(uid, bio, cb){
		//check whether the uid parameter isn't null
		if(uid != undefined){ 
			//change the user's bio
			con.query('UPDATE users SET bio = ? WHERE uid = ?;', [bio, uid], function(err){
				//callback on the sql error
				cb(err);
			});
		}
		//if the uid is null then callback the error.
		else{
			cb("There was no uid to edit students.");
		}
	}

}