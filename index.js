const snoowrap = require('snoowrap')
const uuid = require('node-uuid')

var r = new snoowrap({
	userAgent: "Desmond's App v1 (/u/deslee)",
	clientId: "REDACTED",
	clientSecret: "REDACTED",
	username: "REDACTED",
	password: "REDACTED"
})

r.getMe().then(console.log)
