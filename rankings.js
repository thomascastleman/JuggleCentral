
/*
	Functionality dealing with user rankings.
*/

var con = require('./database.js').connection;

module.exports = {

	// calculate all global user scores
	calcAllUserScores: function(cb) {
		// get the score of each users best records,
		con.query('SELECT r.userUID, r.score, p.difficulty as patternDifficulty FROM records r JOIN patterns p ON r.patternUID = p.uid WHERE r.isPersonalBest = 1 ORDER BY r.userUID;', [], function(err, rows){
			// if there isn't an sql error
			if(!err && rows != undefined){
				//if there is some iformation
				if(rows.length > 0){
					
					//----------------------------------//
					//		NEEDS IMPLEMENTATION		//
					//----------------------------------//
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

				}
				else{
					cb("There are no records to calculate user scores from.");
				}
			}
			else{
				cb("There was an error with retrieval of record information.");
			}
		});
	},

	// calculate global user scores for a subset of users, by UID
	calcUserScores: function(userUIDs, cb) {

	},

	// calculate the record scores for all PB records within a given pattern
	calcRecordScores: function(patternUID, cb) {

	},

	// calculate the difficulties of a subset of patterns
	calcPatternDifficulties: function(patternUIDs, cb) {

	},

	/*	convert existing record scores for both time- and catch-based records into ranks 
		for all the personal best records in this pattern */
	updateLocalRanks: function(patternUID, cb) {

	},

	// convert existing user scores into user ranks for all users
	updateGlobalRanks: function(cb) {

	},

	// determine the UIDs of the patterns in which a given user competes
	affectedPatternsByUser: function(userUID, cb) {

	},

	// determine the UIDs of users who compete in a given pattern
	affectedUsersByPattern: function(patternUID, cb) {

	},

	// get the current max average high score values for both time and catches across all patterns
	getMaxAvgHighScores: function(cb) {
		/*
			Use a con.query to SELECT the MAX() of the avgHighScoreCatch and avgHighScoreTime columns from the patterns table.
			Callback on any errors, and both values
			cb(err, maxAvgCatch, maxAvgTime)
		*/

	},

	// determine the more popular scoring method (time- or catch-based) for a given pattern
	determinePopularScoringMethod: function(patternUID, cb) {
		/*
			
		*/
	}

	/*

	On Delete User:
		Determine the patterns in which this user competed. Remove their records.
		Update record scores & local ranks in all patterns they competed in.
		Find the max avg time high score, and max avg catch high score across all patterns. (current maxes)
		For each of the affected patterns:
			Recalc & store avg high score for both categories.
			Keep track of new max avg time and catch high scores
		If either of the maxes changed:
			Recalc difficulties for all patterns
			Recalc all the user scores, use to update global ranks.
		If not:
			Recalc difficulties for all affected patterns.
			Recalc user scores of those who competed in affected patterns.
		Recalc rank for everyone.

	On Delete / New Record:
		handleRecordChange(patternUID, affectedCategory, cb)
			Recalc record scores (in the affected category) in this pattern, use to update ranks in this pattern.
			If affectedCategory is the more popular category for this pattern: (if it’s not nothing changes)
				Find prevMax, the current max avg high score (all patterns) for the same category that this record is in (these are stored so just retrieve max).
				Recalculate avg high score in this pattern for this category, avg, and store in DB.
					If avg is greater than prevMax,
						Recalc all pattern difficulties.
						Recalc all user scores, and use to update user ranks.
					If avg is less than or equal to prevMax,
						Recalc difficulty for only this pattern
						Recalc user scores for users competing in this pattern
					Recalculate global rank for everyone.

	On Edit Pattern:
		If numObjects changed: (this changes difficulty of this pattern & therefore the user score of every competing user)
			Recalc user score of every user competing in this pattern, and update global rank

	On Delete Pattern:
		Recalc user scores of affected users, and update all global rank.

	*/

}