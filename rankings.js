
/*
	Functionality dealing with user rankings.
*/

module.exports = {

	/*
	calcLocalRanks(patternUID, cb)
		Takes the record scores in both categories of a given pattern and uses them to calculate record rankings for all high score records in that pattern. 

	calcGlobalRanks(cb)
		Transfers the user scores into user ranks for all users.

	On New User:
		Set user score to 0. Get user with largest rank (worst). If scores same (both 0), use same rank. If score greater, use rank + 1

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

	On Edit / Delete / New Record:
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

	*/

}