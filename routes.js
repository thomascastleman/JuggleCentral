

module.exports = {

	init: function(app) {

		// send user's session info (for testing auth)
		app.get('/', function(req, res) {
			res.send(req.user || "There is no session for this user.");
		});

	}

}