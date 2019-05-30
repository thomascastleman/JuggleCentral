
/*
	All system routes
*/

var moment = require('moment');
var auth = require('./auth.js');
var getters = require('./getters.js');
var maintenance = require('./maintenance.js');
var search = require('./search.js');
var sys = require('./settings.js');

module.exports = {

	init: function(app) {

		/* --------------- Unrestricted Endpoints --------------- */

		// render home page
		app.get('/', function(req, res) {
			// get default render object
			var render = defRender(req);

			// store club name in render object
			render.jugglingClub = sys.jugglingClubName;

			// get recent personal bests
			getters.getRecentPersonalBests(sys.homeActivityLimit, function(err, PBs) {
				if (!err) {
					// get recently created user accounts
					getters.getRecentNewUsers(sys.homeActivityLimit, function(err, newUsers) {
						if (!err) {
							// get recently created patterns
							getters.getRecentNewPatterns(sys.homeActivityLimit, function(err, newPatterns) {
								if (!err) {
									// add all recent activity into one array
									render.activity = PBs.concat(newUsers).concat(newPatterns);

									for (var i = 0; i < render.activity.length; i++) {
										var a = render.activity[i];
										// parse time created into moment object for comparison
										a.timeCreated = moment(a.timeCreated);

										// get relative time as string (ie 30 min ago)
										a.relativeTime = a.timeCreated.fromNow();
									}

									if (render.activity.length > 0) {
										// sort by date of occurrence (most recent to front)
										render.activity.sort(function(a, b) {
											return b.timeCreated.isBefore(a.timeCreated) ? -1 : 1;
										});

										// register that there is activity to show
										render.activityExists = true;
									}

									// limit size of results by parameter in settings.js
									render.activity = render.activity.slice(0, sys.homeActivityLimit);

									// render home page with activity notifications
									res.render('home.html', render);

								} else {
									error(res, "Failed to gather recently created pattern information.");
								}
							});
						} else {
							error(res, "Failed to gather recently created user account information.");
						}
					});
				} else {
					error(res, "Failed to gather recent personal bests information.");
				}
			});
		});

		// render leaderboard
		app.get('/leaderboard', function(req, res) {
			// get default render object
			var render = defRender(req);

			// get all jugglers ordered by rank
			getters.getGlobalLeaderboard(function(err, jugglers) {
				if (!err) {
					// store ranked jugglers in render object, register that they exist
					render.jugglers = jugglers;
					render.jugglersExist = jugglers.length > 0;

					// render page with leaderboard
					res.render('leaderboard.html', render);
				} else {
					error(res, "Failed to retrieve global leaderboard.");
				}
			});
		});

		// render search page
		app.get('/search', function(req, res) {
			// get default render object
			var render = defRender(req);
			
			// render search page appropriately, with all patterns
			renderSearchPage(req, res, render);
		});

		// render search page for a specific query
		app.post('/search', function(req, res) {
			// get default render object
			var render = defRender(req);

			// render search page, given query and search parameters in request
			renderSearchPage(req, res, render);
		});

		// render pattern page
		app.get('/pattern/:id', function(req, res) {
			// get default render object
			var render = defRender(req);

			// get basic pattern info
			getters.getPattern(req.params.id, function(err, pattern) {
				if (!err) {
					// cache in render object
					render.pattern = pattern;

					// get records associated with this pattern
					getters.getRecordsByPattern(req.params.id, function(err, records) {
						// add records to render object
						render.records = records;
						render.recordsExist = records.timeRecords.length > 0 || records.catchRecords.length > 0;

						// render page with info filled in
						res.render('pattern.html', render);
					});
				} else {
					error(res, "Failed to retrieve pattern information for editing.");
				}
			});
		});

		// render user page
		app.get('/user/:id', function(req, res) {
			// get default render object
			var render = defRender(req);

			// register if viewing own profile
			render.viewingOwn = req.user && req.user.local && req.params.id == req.user.local.uid;

			//get information associated with the user
			getters.getUser(req.params.id, function(err, user){
				if(!err){
					//get the records associated with the user
					getters.getRecordsByUser(req.params.id, function(err, records){
						if(!err){
							//if the users chosen name and real name are not the same
							if (user.name != user.realName){
								render.showBothNames = true;
							}

							// add user info & record info to render object
							render.user = user;
							render.records = records;

							// render user page
							res.render('user.html', render);
						}else{
							error(res, "Failed to get records of the requested user.");
						}
					});
				}else{
					error(res, "Failed to find user with requested id.");
				}
			});
		});

		/* --------------- Administrator Endpoints --------------- */

		app.get('/admin', auth.isAdminGET, function(req, res) {
			// get default render object
			var render = defRender(req);

			// get all user profiles
			getters.getAllUsers(function(err, users) {
				if (!err) {
					// store in render object
					render.users = users;

					// get all pattern info (with recent patterns first)
					getters.getAllPatterns(true, function(err, patterns) {
						if (!err) {
							// store in render object
							render.patterns = patterns;

							// render admin portal with info filled in
							res.render('admin.html', render);
						} else {
							error(res, "Failed to retrieve all pattern information.");
						}
					});
				} else {
					error(res, "Failed to retrieve all user information.");
				}
			});
		});

		// admin request to add a new user
		app.post('/addUser', auth.isAdminPOST, function(req, res) {
			// if switch element was checked, use isAdmin = 1, otherwise 0
			req.body.isAdmin = req.body.isAdmin == 'on' ? 1 : 0;

			// if all required fields are defined
			if (req.body.name && req.body.email && req.body.isAdmin != undefined) {
				// add user to users table
				maintenance.addUser(req.body.name, req.body.email, req.body.bio, req.body.isAdmin, function(err, profile) {
					if (!err) {
						// redirect to admin portal
						res.redirect('/admin');
					} else {
						error(res, "Failed to create new user account.");
					}
				});
			} else {
				error(res, "Failed to add new user as required fields were improperly filled.");
			}
		});

		// admin request to change admin status of a user
		app.post('/changeAdminStatus', auth.isAdminPOST, function(req, res) {
			// if required fields are defined
			if (req.body.uid > 0 && req.body.isAdmin != undefined) {
				// apply edits to isAdmin attribute only
				maintenance.editUser(req.body.uid, null, null, req.body.isAdmin, function(err) {
					// respond with error, if any
					res.send({ err: err });
				});
			} else {
				// send error for invalid fields
				res.send({ err: "Failed to update admin status as the UID or status provided was invalid." });
			}
		});

		// admin request to remove an existing user
		app.post('/removeUser/:id', auth.isAdminPOST, function(req, res) {
			if (req.user.local.uid != req.params.id) {
				// attempt to remove the indicated user
				maintenance.removeUser(req.params.id, function(err) {
					if (!err) {
						// go back to admin portal
						res.redirect('/admin');
					} else {
						error(res, "Failed to remove juggler from system.");
					}
				});
			} else {
				error(res, "You are unable to remove your own account from the system.");
			}
		});

		// admin request to add a new juggling pattern
		app.post('/addPattern', auth.isAdminPOST, function(req, res) {
			// if name exists and request has positive number of objects
			if (req.body.name && req.body.numObjects > 0) {
				// add to patterns table
				maintenance.addPattern(req.body.name, req.body.description, req.body.numObjects, req.body.GIF, function(err) {
					if (!err) {
						// redirect back to admin portal to see updated patterns table
						res.redirect('/admin');
					} else {
						error(res, "Failed to add new pattern to database.");
					}
				});
			} else {
				error(res, "Failed to add new pattern as one or more required fields was invalid.");
			}
		});

		// render edit pattern page for admin
		app.get('/editPattern/:id', auth.isAdminGET, function(req, res) {
			// get default render object
			var render = defRender(req);

			// get basic pattern info
			getters.getPattern(req.params.id, function(err, pattern) {
				if (!err) {
					// cache in render object
					render.pattern = pattern;

					// get records associated with this pattern
					getters.getRecordsByPattern(req.params.id, function(err, records) {
						// add records to render object
						render.records = records;
						render.recordsExist = records.timeRecords.length > 0 || records.catchRecords.length > 0;

						// render page with info filled in
						res.render('edit-pattern.html', render);
					});
				} else {
					error(res, "Failed to retrieve pattern information for editing.");
				}
			});
		});

		// admin request to update an existing pattern
		app.post('/editPattern/:id', auth.isAdminPOST, function(req, res) {
			// if name valid and num objects positive
			if (req.body.name && req.body.numObjects > 0) {
				// apply edits to pattern
				maintenance.editPattern(req.params.id, req.body.name, req.body.numObjects, req.body.description, req.body.GIF, function(err) {
					if (!err) {
						// redirect to pattern's page
						res.redirect('/pattern/' + req.params.id);
					} else {
						error(res, "Failed to apply edits to pattern.");
					}
				});
			} else {
				error(res, "Failed to edit pattern as an invalid name or number of objects was provided.");
			}
		});

		// admin request to remove an existing pattern
		app.post('/removePattern/:id', auth.isAdminPOST, function(req, res) {
			// attempt to remove the indicated pattern
			maintenance.removePattern(req.params.id, function(err) {
				if (!err) {
					// go back to admin portal
					res.redirect('/admin');
				} else {
					error(res, "Failed to remove pattern from system.");
				}
			});
		});


		/* --------------- Regular User Endpoints --------------- */

		// request for edit user page for a given user
		app.get('/editUser/:id', auth.isAuthGET, function(req, res) {
			// get default render object
			var render = defRender(req);

			// if session exists and user is editing OWN profile OR is an admin
			if (req.user.local.uid == req.params.id || req.user.local.isAdmin == '1') {

				getters.getUser(req.params.id, function(err, user) {
					if (!err) {
						// store profile in render object
						render.juggler = user;

						// get user's records to link to edit pages / delete
						getters.getRecordsByUser(req.params.id, function(err, competingPatterns) {
							if (!err) {
								// store competing patterns in render object, register that they exist
								render.competingPatterns = competingPatterns;
								render.recordsExist = competingPatterns.length > 0;

								// render edit page with juggler info filled in
								res.render('edit-user.html', render);
							} else {
								error(res, "Failed to retrieve this juggler's records.");
							}
						});
					} else {
						error(res, "Failed to get juggler profile information.");
					}
				});
			} else {
				error(res, "You do not have authorization to edit this juggler.");
			}
		});

		// request to edit user
		app.post('/editUser/:id', auth.isAuthPOST, function(req, res) {
			// if session exists and user is editing OWN profile OR is an admin
			if (req.user.local.uid == req.params.id || req.user.local.isAdmin == '1') {
				// provided name not empty
				if (req.body.name != '') {
					// apply edits to user's name & bio
					maintenance.editUser(req.params.id, req.body.name, req.body.bio, null, function(err) {
						if (!err) {
							// redirect to user's page
							res.redirect('/user/' + req.params.id);
						} else {
							error(res, "The system failed to edit the requested juggler.");
						}
					});
				} else {
					error(res, "You must provide a user name.");
				}
			} else {
				error(res, "You do not have authorization to edit this juggler.");
			}
		});

		// render add record page without specified pattern
		app.get('/addRecord', auth.isAuthGET, function(req, res) {
			// get default render object
			var render = defRender(req);

			// get info of user for whom to add the record
			getters.getUser(req.user.local.uid, function(err, user) {
				if (!err) {
					// add to render object
					render.juggler = user;

					// get all pattern info for pattern selector
					getters.getAllPatterns(false, function(err, patterns) {
						if (!err) {
							// add to render object
							render.patterns = patterns;

							// render page
							res.render('add-record.html', render);
						} else {
							error(res, "Failed to retrieve all pattern information.");
						}
					});
				} else {
					error(res, "Failed to retrieve user information.");
				}
			});
		});

		// render add record page (for pattern specified by URL UID)
		app.get('/addRecord/:id', auth.isAuthGET, function(req, res) {
			// get default render object
			var render = defRender(req);

			// get info of user for whom to add the record
			getters.getUser(req.user.local.uid, function(err, user) {
				if (!err) {
					// add to render object
					render.juggler = user;

					// get all pattern info for pattern selector
					getters.getAllPatterns(false, function(err, patterns) {
						if (!err) {
							// add to render object
							render.patterns = patterns;

							// select the pattern specified by the URL parameter
							for (var i = 0; i < patterns.length; i++) {
								if (render.patterns[i].uid == req.params.id) {
									render.patterns[i].selected = true;
									break;
								}
							}

							// render page
							res.render('add-record.html', render);
						} else {
							error(res, "Failed to retrieve all pattern information.");
						}
					});
				} else {
					error(res, "Failed to retrieve user information.");
				}
			});
		});

		// request to add a new record
		app.post('/addRecord', auth.isAuthPOST, function(req, res) {
			// get default render object
			var render = defRender(req);

			// if required fields defined and not both catches and duration
			if (req.body.userUID && req.body.patternUID && (req.body.catches > 0 || req.body.duration > 0) && !(req.body.catches > 0 && req.body.duration > 0)) {
				// only allow user to add their own records
				if (req.user.local.uid == req.body.userUID) {
					// get user info for calculating scoring changes
					getters.getUser(req.user.local.uid, function(err, beforeUser) {
						if (!err) {
							// convert duration seconds to HH:mm:ss format for DB insertion
							if (req.body.duration) {
								req.body.duration = formatDuration(req.body.duration);

								// use formatted duration as record string
								render.recordString = req.body.duration;

								// ensure catches field is null
								req.body.catches = null;
							} else {
								// format record string for catches
								render.recordString = req.body.catches + " catches";

								// ensure duration field is null
								req.body.duration = null;
							}

							// add new record to records table
							maintenance.addRecord(req.user.local.uid, req.body.patternUID, req.body.catches, req.body.duration, req.body.video, function(err) {
								if (!err) {
									// get user info for calculating scoring changes
									getters.getUser(req.user.local.uid, function(err, afterUser) {
										if (!err) {
											// store in render object
											render.user = afterUser;

											// calc difference in score / rank since new record
											render.scoreDiff = getDifference(beforeUser.score, afterUser.score);
											render.rankDiff = getDifference(beforeUser.userRank, afterUser.userRank);

											// get pattern name
											getters.getPattern(req.body.patternUID, function(err, pattern) {
												if (!err) {
													// store in render object
													render.pattern = pattern;
													
													// render page
													res.render('add-record-success.html', render);
												} else {
													error(res, "Failed to retrieve related pattern information.");
												}
											});
										} else {
											error(res, "Failed to retrieve related user information after applying record updates.");
										}
									});
								} else {
									error(res, "Faild to add new record.");
								}
							});
						} else {
							error(res, "Failed to retrieve related user information.");
						}
					});
				} else {
					error(res, "You do not have authorization to add a new record for this user.");
				}
			} else {
				error(res, "Failed to add new record as not all required fields were defined.");
			}
		});

		// request to see edit page for an existing record
		app.get('/editRecord/:id', auth.isAuthGET, function(req, res) {
			
		});

		// request to edit an existing record
		app.post('/editRecord/:id', auth.isAuthPOST, function(req, res) {
			
		});

		// request to remove an existing record
		app.post('/removeRecord/:id', auth.isAuthPOST, function(req, res) {
			if (req.body.redirect) {
				// get the owner of this record
				getters.getUserByRecord(req.params.id, function(err, userUID) {
					if (!err) {
						// if session exists and user is attempting to remove OWN record OR is an admin
						if (req.user.local.uid == userUID || req.user.local.isAdmin == '1') {
							// apply removal to db
							maintenance.removeRecord(req.params.id, function(err) {
								if (!err) {
									// redirect to indicated endpoint
									res.redirect(req.body.redirect);
								} else {
									error(res, "Failed to remove the indicated record.");
								}
							});
						} else {
							error(res, "You do not have authorization to remove this record.");
						}
					} else {
						error(res, "Failed to determine ownership of record for removal.");
					}
				});
			} else {
				error(res, "Failed to remove record as no redirect URL given.");
			}
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

// render an error message to user
function error(res, message) {
	res.render('error.html', { message: message });
}

// convert from seconds to HH:mm:ss string
function formatDuration(sec) {
	return moment.utc(sec * 1000).format('HH:mm:ss');
}

// get an object describing difference between two fields
function getDifference(before, after) {
	// calc difference in field
	var d = { diff: after - before };

	// prefix with + or - and add a class describing change
	if (d.diff >= 0) {
		d.diff = '+' + d.diff;
		d.class = d.diff == 0 ? 'neut' : 'pos';
	} else {
		d.class = 'neg';
	}

	return d;
}

// render the search page appropriately with results for the given query and parameters
function renderSearchPage(req, res, render) {
	// parse unrestricted filters / orders from form values into null values
	if (req.body.numObjectsFilter == "All") req.body.numObjectsFilter = null;
	if (req.body.orderBy == "Relevance") req.body.orderBy = null;

	// register whether we're searching patterns or users
	render.searchUsers = req.body.searchUsers == '1';

	// remember the previous query, and whether or not it was empty
	render.query = req.body.query || '';
	render.nonEmptyQuery = req.body.query && req.body.query != '';

	// if searching users instead of patterns
	if (render.searchUsers) {
		// same with user ordering options
		render.orderByOptions = [
			{ name: "RANK", friendlyName: "Rank" }
		];
	} else {
		// add options for ordering to render object so we can select the one being used with mustache
		render.orderByOptions = [
			{ name: "DIFFICULTY", friendlyName: "Difficulty" },
			{ name: "NUM_OBJECTS", friendlyName: "Number of Objects" },
			{ name: "POPULARITY", friendlyName: "Popularity" }
		];
	}

	// if a specified order was used in this query
	if (req.body.orderBy) {
		// select the ordering strategy currently in use
		for (var i = 0; i < render.orderByOptions.length; i++) {
			if (render.orderByOptions[i].name == req.body.orderBy) {
				render.orderByOptions[i].selected = true;
				break;
			}
		}
	}

	// get all number of objects of all existing patterns for filtering
	getters.getPossibleNumObjects(function(err, possibleNumObjects) {
		if (!err) {
			// add to render object
			render.possibleNumObjects = possibleNumObjects;

			// if a filter on the pattern's number of objects was used in this query
			if (req.body.numObjectsFilter) {
				// select the filter currently being used
				for (var i = 0; i < render.possibleNumObjects.length; i++) {
					if (render.possibleNumObjects[i].numObjects == req.body.numObjectsFilter) {
						render.possibleNumObjects[i].selected = true;
						break;
					}
				}
			}

			// if using user search
			if (render.searchUsers) {
				// get user search results
				search.searchUsers(render.query, req.body.orderBy, null, function(err, users) {
					if (!err) {
						// add results to render object
						render.results = users;

						// count the number of pattern results for same query
						search.searchPatternsCOUNT(render.query, null, function(err, numPatternResults) {
							if (!err) {
								// add to render object
								render.numPatternResults = numPatternResults;
								render.numUserResults = render.results.length;

								// determine if any results were found
								render.resultsExist = render.results.length > 0;

								// render page
								res.render('search.html', render);
							} else {
								error(res, "Failed to find pattern search results for juggler query.");
							}
						});
					} else {
						error(res, "Failed to find juggler search results.");
					}
				});

			// if using pattern search
			} else {
				// get pattern search results
				search.searchPatterns(render.query, req.body.numObjectsFilter, req.body.orderBy, null, function(err, patterns) {
					if (!err) {
						// add results to render object
						render.results = patterns;

						// count the number of user results for same query
						search.searchUsersCOUNT(render.query, function(err, numUserResults) {
							if (!err) {
								// add to render object
								render.numUserResults = numUserResults;
								render.numPatternResults = render.results.length;

								// determine if any results were found
								render.resultsExist = render.results.length > 0;

								// render page
								res.render('search.html', render);
							} else {
								error(res, "Failed to find juggler search results for pattern query.");
							}
						});
					} else {
						error(res, "Failed to find pattern search results.");
					}
				});
			}
		} else {
			error(res, "Failed to retrieve pattern metadata for filtering");
		}
	});
}