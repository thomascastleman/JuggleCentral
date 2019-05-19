
/*
	Functionality for accessing table data.
*/

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
	
}