# JuggleCentral
A platform for jugglers to track their progress across various events and access local records.

The format of `credentials.js` should be:
```javascript
module.exports = {
	// Google OAuth2 credentials for user authentication
	GOOGLE_CLIENT_ID: '',
	GOOGLE_CLIENT_SECRET: '',

	// session encryption secret
	SESSION_SECRET: '',

	// MySQL credentials
	MySQL_username: '',
	MySQL_password: '',

	domain: 'http://localhost:8080'
}
```