
module.exports = {

	// port on which server listens
	PORT: 8080,

	// name of organization's juggling club
	jugglingClubName: "STAB Juggling Squad",

	/*	Required domain for new user account emails.
		Use a regular expression that will match any email from your domain. */
	emailDomainRestriction: /.+?@(students\.)?stab\.org/,

	// amount by which to scale up user scores (higher scale, greater precision)
	userScoreScalingFactor: 100
}