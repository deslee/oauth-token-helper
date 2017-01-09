const request = require('request')
const process = require('process')
const uuid = require('node-uuid')
const querystring = require('querystring')
const CONFIG = {
	"app": {
		"id": "REDACTED",
		"secret": "REDACTED",
		"redirect_uri": "http://github.deslee.me/reddit-oauth-example/"
	}
}

var GLOBALS = {}

function get_auth_code_uri() {
	var authorize_uri = "https://www.reddit.com/api/v1/authorize"
	
	var query = querystring.stringify({
		client_id: CONFIG.app.id,
		response_type: "code",
		state: uuid.v1(),
		redirect_uri: CONFIG.app.redirect_uri,
		duration: "permanent",
		scope: "identity"
	})

	return authorize_uri + "?" + query
}

function wrap_api_response(context, cb) {

		var error = context.error
		var response = context.response
		var body = context.body
		var expected_keys = context.expected_keys

		if (error) {
			cb("http client error: " + JSON.stringify(error))
			// TODO handle error
		} else if (response.statusCode != 200) {
			cb("got " + response.statusCode + " response")
			// TODO handle unauthorized
		} else {
			var responseBody = {};
			try {
				responseBody = JSON.parse(response.body)
			} catch (e) {
				cb("couldn't parse response body: " + response.body)
				// TODO handle invalid json
			}


			if (responseBody.error) {
				cb("response body had error: " + responseBody.error);
				// handle response body error
			} else {
				var isValid;
				if (expected_keys) {
					var actual_keys = Object.keys(responseBody)

					isValid = expected_keys.map(function(key){
						return actual_keys.indexOf(key) != -1
					}).indexOf(false) == -1
				} else {
					isValid = true
				}

				if (!isValid) {
					cb("response body is not valid: " + JSON.stringify(actual_keys) + " expected " + JSON.stringify(expected_keys));
					// handle not valid response body
				} else {
					cb(null, responseBody)
				}
			}

		}

}

function get_token(code, cb) {
	console.log("getting token")

	var token_uri = "https://www.reddit.com/api/v1/access_token"

	var query = {
		grant_type: "authorization_code",
		code: code,
		redirect_uri: CONFIG.app.redirect_uri
	}


	request({
		url: token_uri,
		qs: query,
		method: "POST",
		auth: {
			user: CONFIG.app.id,
			pass: CONFIG.app.secret
		}
	}, function(error, response, body) {
		wrap_api_response({
			error: error,
			response: response,
			body: body,
			expected_keys: ["access_token", "token_type", "expires_in", "scope", "refresh_token"]
		}, function(err, result) {
			cb(err, result)
		})
	});
}

function refresh_token(refresh_token, cb) {
	console.log("refreshing token")
	request({
		uri: "https://www.reddit.com/api/v1/access_token",
		auth: {
			user: CONFIG.app.id,
			pass: CONFIG.app.secret
		},
		method: "POST",
		qs: {
			grant_type: "refresh_token",
			refresh_token: refresh_token
		}
	}, function(error, response, body) {
		wrap_api_response({
			error: error,
			response: response,
			body: body,
			expected_keys: ["access_token", "token_type", "expires_in", "scope"]
		}, function(err, result) {
			cb(null, result.access_token)
		})
	})
}

if(process.env.REDDIT_REFRESH_TOKEN) {
	refresh_token(process.env.REDDIT_REFRESH_TOKEN, function(err, token) {
		if (err) {
			console.log(err)
		} else {
			GLOBALS.token = token
			start()
		}
	})
} else if (process.env.REDDIT_AUTH_CODE) {
	get_token(process.env.REDDIT_AUTH_CODE, function(err, token) {
		if (err) {
			console.log(err)
		} else {
			console.log(JSON.stringify(token))
		}
	});
} else {
	console.log(get_auth_code_uri())
}

function start() {
	console.log("getting user")
	request({
		uri: "https://oauth.reddit.com/api/v1/me",
		headers: {
			Authorization: "Bearer " + GLOBALS.token,
			'User-Agent': "Desmond's App 0.1 (by /u/deslee)"
		}
	}, function(error, response, body) {
		wrap_api_response({
			error: error,
			response: response,
			body: body,
			expected_keys: ["name"]
		}, function(err, result) {
			if (err) {
				console.log(err)
			} else {
				console.log("Username: " + result.name)
			}
		})
	})
}
