
DROP DATABASE IF EXISTS juggling;
CREATE DATABASE juggling;

USE juggling;

-- all system users
CREATE TABLE users (
	uid INT NOT NULL AUTO_INCREMENT,
	timeCreated DATETIME,
	name VARCHAR(64),
	email VARCHAR(64) UNIQUE,
	bio TEXT,
	isAdmin TINYINT(1),
	score FLOAT,					-- sum of this user's high score record scores
	userRank INT,					-- user's position in the leaderboard sorted / pooled by user score
	PRIMARY KEY (uid)
);

-- juggling patterns
CREATE TABLE patterns (
	uid INT NOT NULL AUTO_INCREMENT,
	timeCreated DATETIME,
	name VARCHAR(32) UNIQUE,
	description TEXT,
	numObjects INT,					-- number of objects used in this pattern
	GIF VARCHAR(512),
	difficulty FLOAT,				-- relative difficulty of this pattern
	avgHighScoreCatch FLOAT,		-- average high score for catches in this pattern
	avgHighScoreTime FLOAT,			-- average high score for time in this pattern (ms)
	PRIMARY KEY (uid)
);

-- all reported attempts at events
CREATE TABLE records (
	uid INT NOT NULL AUTO_INCREMENT,
	userUID INT,
	patternUID INT,
	isPersonalBest TINYINT(1),		-- is this record the user's personal best for this pattern?
	score FLOAT,					-- ratio of this user's high score to the pattern high score
	recordRank INT,					-- position of this record in this pattern leaderboard sorted / pooled by duration / catches
	catches INT,					-- number of catches in this attempt (catch-based)
	duration TIME,					-- duration of this attempt (time-based)
	timeRecorded DATETIME,			-- when the record was added
	video VARCHAR(512),
	FOREIGN KEY (userUID) REFERENCES users(uid) ON DELETE CASCADE,
	FOREIGN KEY (patternUID) REFERENCES patterns(uid) ON DELETE CASCADE,
	PRIMARY KEY (uid)
);