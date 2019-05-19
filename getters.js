
/*
	Functionality for accessing table data.
*/

var con = require('./database.js').connection;

module.exports = {

	/*
	getUser(uid, cb)
	Get all user info associated with ID.

	getPattern(uid, cb)
		Get all pattern info associated with ID.

	getRecordsByUser(userUID, cb)
		Get all the records of a given user to be parsed with future smart scripts. Will JOIN to get pattern name. ORDER BY patternUID, catches, duration. Splits into [{patternUID: 1, catches:[], duration:[]}]

	getRecordsByPattern(patternUID, cb)
		Get all records for a specific pattern by UID. JOINs on user name. ORDER BY catches, duration; (this should both split the records into two “sections” and sort them properly in each category. Splits into catch-based and time-based records, returns object with both arrays.

	getGlobalLeaderboard(cb)
		Gets all users, ordered by rank.

	getRecentPersonalBests(limit, cb)
		Get recently set records which are personal bests, within a date cutoff.

	getRecentNewUsers(limit, cb)
		Get recently created users.

	getRecentNewPatterns(limit, cb)
		Get recently created patterns.
	*/

	//Get all user info associated with ID.
	getUser: function(uid, cb){
		//check for insufficient fields
		if(uid != undefined){
			//retrieve the information from the db
			con.query('SELECT * FROM users WHERE uid = ?;', [uid], function(err, rows){
				//if there isn't an error, callback the info.
				if(!err && rows !== undefined && rows.length > 0){
					cb(rows[0]);
				} 
				else {
					//callback an error
					cb("Unable to retrieve user information.");
				}
			});
		}
		//error on insufficient fields
		else{
			cb("uid is undefined.");
		}
	},

	//Get all pattern info associated with ID.
	getPattern: function(uid, cb){
		//check for insufficient fields
		if(uid != undefined){
			//retrieve the information from the db
			con.query('SELECT * FROM patterns WHERE uid = ?;', [uid], function(err, rows){
				//if there isn't an error, callback the info.
				if(!err && rows !== undefined && rows.length > 0){
					cb(rows[0]);
				} 
				else {
					//callback error
					cb("Unable to retrieve pattern information.");
				}
			});
		}
		//error on insufficient fields
		else{
			cb("uid is undefined.");
		}
	},

	//Get all the records of a given user to be parsed with future smart scripts. Will JOIN to get pattern name. ORDER BY patternUID, catches, duration. Splits into [{patternUID: 1, catches:[], duration:[]}]
	getRecordsByUser: function(userUID, cb){
		//check for insufficient fields
		if(userUID != undefined){
			//retrieve the information from the db
			con.query('SELECT * FROM records r JOIN patterns p ON r.patternUID = p.uid WHERE userUID = ? ORDER BY r.patternUID, r.duration, r.catches DESC;' [userUID], function(err, rows){
				//if there isn't an error, callback the info.
				if (!err && rows !== undefined){
					//if there are records
					if (rows.length > 0){
						var curPatternUID = rows[0].patternUID;
						var splitRecords = [{patternUID: curPatternUID, catches: [], duration:[]}];
						var splitRecordsIndex = 0;
 
						for (var i = 0; i < rows.length; i++){
							//if the duration of the record is defined
							if (rows[i].duration){
								//append this duration to the list of durations associated with this patternUID
								splitRecords[splitRecordsIndex].duration.append(rows[i].duration);
							}
							//if the catches field of the record is defined
							else {
								//append this number of catches to the list of catches associated with this patternUID
								splitRecords[splitRecordsIndex].catches.append(rows[i].catches);
							}

							//if the list has moved on to a new patternUID
							if (curPatternUID != rows[i+1].patternUID){
								curPatternUID = rows[i+1].patternUID
								splitRecords.append({patternUID: curPatternUID, catches:[], duration:[]});
								splitRecordsIndex += 1;
							}
						}

						cb(null, splitRecords);
					}
					//if there aren't any records
					else{
						cb(null, rows);
					}
				}
				else{
					//callback error
					cb("Unable to retrieve user's record information.");
				}
			});
		}
		//error on insufficient fields
		else{
			cb("userUID is undefined.");
		}
	},

	//Get all records for a specific pattern by UID. JOINs on user name. ORDER BY catches, duration; (this should both split the records into two “sections” and sort them properly in each category. Splits into catch-based and time-based records, returns object with both arrays.
	getRecordsByPattern: function(patternUID, cb){
		//check for insufficient fields
		if(patternUID != undefined){
			//retrieve the information from the db
			con.query('SELECT * FROM records r JOIN users u ON r.userUID = u.uid WHERE r.patternUID = ? ORDER BY r.catches, r.duration;', [patternUID], function(err, rows){
				//if there aren't any errors
				if(!err && rows !== undefined){
					//if there is some data
					if(rows.length > 0){
						var splitRecords = [[], []]
						for(var i = 0; i < rows.length; i++){
							//if this record uses catches
							if(rows[i].catches != undefined){
								//add it to the catches part of the split records
								splitRecords[0].append(rows[i].catches);
							}
							else{
								//add the duration to the duration part of the split records
								splitRecords[1].append(rows[i].duration);
							}
						}

						cb(null, splitRecords);

					}
					else{
						cb(null, rows);
					}
				}
			});
		}
		else{
			cb("patternUID is undefined")
		}
	}
	
}