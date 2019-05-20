
/*
	All system routes
*/

var getters = require('./getters.js');
var maintenance = require('./maintenance.js');
var rankings = require('./rankings.js');
var search = require('./search.js');
var sys = require('./settings.js');

module.exports = {

	init: function(app) {

		// send user's session info (for testing auth)
		app.get('/', function(req, res) {
			// debug
			res.send(req.user || "There is no session for this user.");
		});

	}

}