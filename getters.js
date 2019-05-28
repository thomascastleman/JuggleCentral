
/*
	Functionality for accessing table data.
*/

var con = require('./database.js').connection;
var moment = require('moment');

module.exports = {

	// Get all user info associated with ID.
	getUser: function(uid, cb){
		// check for insufficient fields
		if (uid){
			// retrieve the information from the db
			con.query('SELECT * FROM users WHERE uid = ?;', [uid], function(err, rows){
				//if there isn't an error, callback the info.
				if(!err && rows !== undefined && rows.length > 0){
					cb(err, rows[0]);
				}
				else {
					//callback an error
					cb("Unable to retrieve user information.");
				}
			});
		}
		// error on insufficient fields
		else{
			cb("uid is undefined.");
		}
	},

	// Get all pattern info associated with ID.
	getPattern: function(uid, cb){
		// check for insufficient fields
		if (uid){
			// retrieve the information from the db
			con.query('SELECT * FROM patterns WHERE uid = ?;', [uid], function(err, rows){
				// if there isn't an error, callback the info.
				if(!err && rows !== undefined && rows.length > 0){
					cb(err, rows[0]);
				} 
				else {
					// callback error
					cb("Unable to retrieve pattern information.");
				}
			});
		}
		// error on insufficient fields
		else{
			cb("uid is undefined.");
		}
	},

	/*	Get all the records of a given user.
		Will JOIN to get pattern name. ORDER BY patternUID, catches, duration. 
		Splits into array of pattern objects with uid, name, and all catch and time records for this user */
	getRecordsByUser: function(userUID, cb){
		// check for insufficient fields
		if (userUID != undefined){
			// retrieve the information from the db
			con.query('SELECT r.*, p.name AS patternName FROM records r JOIN patterns p ON r.patternUID = p.uid WHERE r.userUID = ? ORDER BY r.patternUID, r.duration DESC, r.catches DESC;', [userUID], function(err, rows){
				// if there isn't an error, callback the info.
				if (!err && rows !== undefined){
					var patterns = [];
					var idToPattern = {};

					// for each record
					for (var i = 0; i < rows.length; i++) {
						var r = rows[i];

						// convert date into human-readable format
						r.date = moment(r.timeRecorded);
						if (r.date) r.date = r.date.format('M/D/YYYY [at] h:mm A');

						// if no existing object for this record's pattern
						if (!idToPattern[r.patternUID]) {
							// create new object to manage data for this pattern
							idToPattern[r.patternUID] = {
								uid: r.patternUID,
								name: r.patternName,
								catchRecords: [],
								timeRecords: []
							};
						}

						// insert into the appropriate array of records within pattern object
						if (r.catches != null) {
							idToPattern[r.patternUID].catchRecords.push(r);
							idToPattern[r.patternUID].catchRecordsExist = true;
						} else {
							idToPattern[r.patternUID].timeRecords.push(r);
							idToPattern[r.patternUID].timeRecordsExist = true;
						}
					}

					// add all pattern objects into one array
					for (var id in idToPattern) {
						if (idToPattern.hasOwnProperty(id)) {
							patterns.push(idToPattern[id]);
						}
					}

					// callback on patterns array
					cb(err, patterns);
				} else {
					// callback error
					cb(err || "Unable to retrieve user's record information.");
				}
			});
		}
		// error on insufficient fields
		else{
			cb("Unable to get records as no user UID was given.");
		}
	},

	/*	Get all records for a specific pattern by UID. JOINs on user name. ORDER BY catches, duration;
		This should both split the records into two “sections” and sort them properly in each category. 
		Splits into catch-based and time-based records, returns object with both arrays. */	
	getRecordsByPattern: function(patternUID, cb){
		//check for insufficient fields
		if (patternUID != undefined){
			// get all records associated with this pattern, JOINing on users table to get associated username & user rank
			con.query('SELECT r.*, u.name AS userName, u.userRank FROM records r JOIN users u ON r.userUID = u.uid WHERE r.patternUID = ? ORDER BY r.catches DESC, r.duration DESC;', [patternUID], function(err, rows){
				// if there aren't any errors
				if(!err && rows !== undefined){
					// object to store records for this pattern
					var records = {
						catchRecords: [],
						timeRecords: []
					};

					// for each record associated with this pattern
					for (var i = 0; i < rows.length; i++){

						// convert date into human-readable format
						rows[i].date = moment(rows[i].timeRecorded);
						if (rows[i].date) rows[i].date = rows[i].date.format('M/D/YYYY [at] h:mm A');

						// if this record uses catches
						if (rows[i].catches != undefined){
							// add it to the catches part of the split records
							records.catchRecords.push(rows[i]);
						}
						else{
							//add the duration to the duration part of the split records
							records.timeRecords.push(rows[i]);
						}
					}

					// callback on object with both catch- and time-based records
					cb(err, records);
				} else {
					cb(err || "Unable to retrieve records for this pattern.");
				}
			});
		}
		else{
			cb("Unable to get records by pattern, as no pattern was specified.")
		}
	},

	// Gets all users, ordered by rank.
	getGlobalLeaderboard: function(cb) {
		// select from users and order by rank
		con.query('SELECT * FROM users ORDER BY userRank ASC;', function(err, rows) {
			if (!err && rows !== undefined) {
				// callback on user profiles
				cb(err, rows);
			} else {
				// callback on error
				cb(err || "Unable to retrieve user data for global leaderboard.");
			}
		});
	},

	// Get recently set records which are personal bests
	getRecentPersonalBests: function(limit, cb) {
		if (limit && limit > 0) {
			// select only personal bests from records, joining to get user and pattern name, limiting size of response
			con.query('SELECT r.*, r.timeRecorded AS timeCreated, u.name AS userName, p.name AS patternName, 1 = 1 AS isPBActivity FROM records r JOIN users u ON r.userUID = u.uid JOIN patterns p ON r.patternUID = p.uid WHERE r.isPersonalBest = 1 LIMIT ?;', [limit], function(err, rows) {
				if (!err && rows !== undefined) {
					// callback on records
					cb(err, rows);
				} else {
					// callback on error finding records
					cb(err || "Unable to retrieve any records.");
				}
			});
		} else {
			// callback on error for lack of limit
			cb("Unable to get recent personal bests as no limit on the number of records was given.");
		}
	},

	// Get recently created users.
	getRecentNewUsers: function(limit, cb) {
		// ensure limit exists and is positive
		if (limit && limit > 0) {
			// select the most recently created users, ordering by recentness
			con.query('SELECT users.*, 1 = 1 AS isNewUserActivity FROM users ORDER BY timeCreated DESC LIMIT ?;', [limit], function(err, rows) {
				if (!err && rows !== undefined) {
					cb(err, rows);
				} else {
					cb(err || "Unable to retrieve recently created users.");
				}
			});
		} else {
			cb("Invalid limit to number of users to retrieve.");
		}
	},

	// Get recently created patterns.
	getRecentNewPatterns: function(limit, cb) {
		// ensure limit exists and is positive
		if (limit && limit > 0) {
			// select the most recently created patterns, ordering by recentness
			con.query('SELECT patterns.*, 1 = 1 AS isNewPatternActivity FROM patterns ORDER BY timeCreated DESC LIMIT ?;', [limit], function(err, rows) {
				if (!err && rows !== undefined) {
					cb(err, rows);
				} else {
					cb(err || "Unable to retrieve recently created patterns.");
				}
			});
		} else {
			cb("Invalid limit to number of patterns to retrieve.");
		}
	},

	// get all possible numbers of objects of existing patterns
	getPossibleNumObjects: function(cb) {
		// select numObjects and group by numObjects to remove duplicates
		con.query('SELECT numObjects FROM patterns GROUP BY numObjects;', function(err, rows) {
			if (!err && rows !== undefined && rows.length > 0) {
				cb(err, rows);
			} else {
				cb(err || "Unable to retrieve all possible number of objects of existing patterns.");
			}
		});
	}
	
}