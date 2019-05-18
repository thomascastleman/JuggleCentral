
DROP DATABASE IF EXISTS juggling;
CREATE DATABASE juggling;

USE juggling;

-- all system users
CREATE TABLE users (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(64),
	email VARCHAR(64),
	bio TEXT,
	isAdmin TINYINT(1),
	PRIMARY KEY (uid)
);

-- juggling patterns
CREATE TABLE patterns (
	uid INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(32),
	description TEXT,
	GIF VARCHAR(512),
	numObjects INT,
	difficulty FLOAT,
	PRIMARY KEY (uid)
);

-- all reported attempts at events
CREATE TABLE records (
	uid INT NOT NULL AUTO_INCREMENT,
	userUID INT,
	patternUID INT,
	rank INT,
	catches INT,
	duration TIME,
	timeRecorded DATETIME,
	video VARCHAR(512),
	FOREIGN KEY (userUID) REFERENCES users(uid) ON DELETE CASCADE,
	FOREIGN KEY (patternUID) REFERENCES patterns(uid) ON DELETE CASCADE,
	PRIMARY KEY (uid)
);

-- all global rankings of users
CREATE TABLE globalRankings (
	uid INT NOT NULL AUTO_INCREMENT,
	userUID INT,
	rank INT,
	FOREIGN KEY (userUID) REFERENCES users(uid),
	PRIMARY KEY (uid)
);