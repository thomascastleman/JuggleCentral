
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

		// render home page
		app.get('/', function(req, res) {
			// get default render object
			var render = defRender(req);

			res.render('home.html', render);
		});

		// render leaderboard
		app.get('/leaderboard', function(req, res) {
			// get default render object
			var render = defRender(req);

			res.render('leaderboard.html', render);
		});

		// render search page
		app.get('/search', function(req, res) {
			// get default render object
			var render = defRender(req);

			res.render('search.html', render);
		});

		// render pattern page
		app.get('/pattern/:id', function(req, res) {
			// get default render object
			var render = defRender(req);

			res.render('pattern.html', render);
		});

		// render user page
		app.get('/user/:id', function(req, res) {
			// get default render object
			var render = defRender(req);

			res.render('user.html', render);
		});

	}

}

// get the default render object for rendering any page
function defRender(req) {
	// if user is authenticated & has session
	if (req.isAuthenticated() && req.user && req.user.local) {
			// basic render object for fully authenticated user
			return {
				auth: {
					isAuthenticated: true,
					userUID: req.user.local.uid,
					userIsAdmin: req.user.local.isAdmin,
					givenName: req.user.name.givenName
				}
			};
	} else {
		// default welcome message for unauthenticated user
		return {};
	}
}