
/*
	All system routes
*/

var auth = require('./auth.js');
var getters = require('./getters.js');
var maintenance = require('./maintenance.js');
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

		/* --------------- Administrator Endpoints --------------- */

		// admin request to add a new user
		app.post('/addUser', auth.isAdminPOST, function(req, res) {

		});

		// admin request to change admin status of a user
		app.post('/changeAdminStatus', auth.isAdminPOST, function(req, res) {
			
		});

		// admin request to remove an existing user
		app.post('/removeUser', auth.isAdminPOST, function(req, res) {
			
		});

		// admin request to add a new juggling pattern
		app.post('/addPattern', auth.isAdminPOST, function(req, res) {
			
		});

		// admin request to update an existing pattern
		app.post('/editPattern', auth.isAdminPOST, function(req, res) {
			
		});

		// admin request to remove an existing pattern
		app.post('/removePattern', auth.isAdminPOST, function(req, res) {
			
		});


		/* --------------- Regular User Endpoints --------------- */

		// request to edit user
		app.post('/editUser', auth.isAuthPOST, function(req, res) {
			
		});

		// request to add a new record
		app.post('/addRecord', auth.isAuthPOST, function(req, res) {
			
		});

		// request to edit an existing record
		app.post('/editRecord', auth.isAuthPOST, function(req, res) {
			
		});

		// request to remove an existing record
		app.post('/removeRecord', auth.isAuthPOST, function(req, res) {
			
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