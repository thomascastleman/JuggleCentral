
/* 
	auth.js: Authentication routes / configurations and middleware for restricting pages / requests to various levels of authentication
*/

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var querystring = require('querystring');
var con = require('./database.js').connection;
var creds = require('./credentials.js');
var sys = require('./settings.js');
var maintenance = require('./maintenance.js');

module.exports = {

	// set up routes and configure authentication settings
	init: function(app, passport) {

		// cache user info from our system into their session
		passport.serializeUser(function(user, done) {
			// look up user in system by email
			con.query('SELECT * FROM users WHERE email = ?;', [user._json.email], function(err, rows) {
				if (!err && rows !== undefined && rows.length > 0) {
					// store profile in session
					user.local = rows[0];

					// send user through
					done(null, user);

				// if no user exists, test email against regular expression (or if no restriction, allow any new user)
				} else if (!sys.emailDomainRestriction || sys.emailDomainRestriction.test(user._json.email)) {
					// add a new non-admin user to the system
					maintenance.addUser(user.displayName, user._json.email, null, 0, function(err, profile) {
						if (!err) {
							// add profile to session
							user.local = profile;

							// send user through
							done(null, user);
						} else {
							done("The system failed to create a new user account with this email.", null);
						}
					});
				} else {
					done("The system failed to find a user account associated with the given email.", null);
				}
			});
		});

		passport.deserializeUser(function(user, done) {
			done(null, user);
		});

		// Google OAuth2 config with passport
		passport.use(new GoogleStrategy({
				clientID:		creds.GOOGLE_CLIENT_ID,
				clientSecret:	creds.GOOGLE_CLIENT_SECRET,
				callbackURL:	creds.domain + "/auth/google/callback",
				passReqToCallback: true,

				// tells passport to use userinfo endpoint instead of Google+
				userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
			},
			function(request, accessToken, refreshToken, profile, done) {
				process.nextTick(function () {
					return done(null, profile);
				});
			}
		));

		app.use(passport.initialize());
		app.use(passport.session());

		// authentication with google endpoint
		app.get('/auth/google', module.exports.checkReturnTo, passport.authenticate('google', { scope: [
				'profile',
				'email'
			]
		}));

		// callback for google auth
		app.get('/auth/google/callback',
			passport.authenticate('google', {
				successReturnToOrRedirect: '/',
				failureRedirect: '/failure'
		}));

		// handler for failure to authenticate
		app.get('/failure', function(req, res) {
			res.render('error.html', { message: "Unable to authenticate." });
		});

		// logout handler
		app.get('/logout', module.exports.checkReturnTo, function(req, res){
			req.logout();
			res.redirect(req.session.returnTo || '/');
		});

		return module.exports;
	},

	// middleware to check for a URL to return to after authenticating
	checkReturnTo: function(req, res, next) {
		var returnTo = req.query['returnTo'];
		if (returnTo) {
			// if no session, replace with empty object
			if (!req.session) req.session = {};

			// add returnTo address to session
			req.session.returnTo = querystring.unescape(returnTo);
		}
		next();
	},

	// middleware to restrict pages to authenticated users
	isAuthGET: function(req, res, next) {
		// if authenticated and has session data from our system
		if (req.isAuthenticated() && req.user.local) {
			return next();
		} else {
			// redirect to auth screen, with returnTo link to this page
			res.redirect('/auth/google?returnTo=' + querystring.escape(req.url));
		}
	},

	// middleware to restrict pages to admin users
	isAdminGET: function(req, res, next) {
		// if authenticated and has session data
		if (req.isAuthenticated() && req.user.local) {
			// if administrator, allow
			if (req.user.local.isAdmin) {
				return next();
			} else {
				res.redirect('/');
			}
		} else {
			res.redirect('/auth/google?returnTo=' + querystring.escape(req.url));
		}
	},

	// middleware (for POST reqs) to check if auth'd
	isAuthPOST: function(req, res, next) {
		if (req.isAuthenticated() && req.user.local) {
			return next();
		} else {
			res.redirect('/');
		}
	},

	// middleware (for POSTs) to check if requester is admin
	isAdminPOST: function(req, res, next) {
		if (req.isAuthenticated() && req.user.local && req.user.local.isAdmin == 1) {
			return next();
		} else {
			res.redirect('/');
		}
	}

}