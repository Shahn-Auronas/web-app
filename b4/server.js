#!/usr/bin/env node --harmony

/*
 * Chapter 7 of Node the Right Way from
 * Pragmatic Bookshelf, per their Copyrights
 *
 */

 'use strict';

 const log = require('npmlog'),
       request = require('request'),
       express = require('express'),
       session = require('express-session'),
       morgan = require('morgan'),
       cookieParser = require('cookie-parser'),
       bodyParser = require('body-parser'),
       passport = require('passport'),

       app = express(),
       //storing session cookies
       redisClient = require('redis').createClient(),
       RedisStore = require('connect-redis')(session),
       GoogleStrategy = require('passport-google').Strategy;

//Logging for key events to redisClient
redisClient.on('ready', function () {
	log.info('REDIS', 'ready');
}).on('error', function (err) {
	log.error('REDIS', err.message);
});

//configuring passport 
//serializeUser() method: specify what's stored in session cookie
//identifier string is unique, user-specific URL provided by Google
passport.serializeUser(function (user, done) {
	done(null, user.indentifer);
});
//deserializeUser() method takes stored session data and 
//turns into rich object to be used by app
passport.deserializeUser(function (id, done) {
	done(null, { identifier: id });
});
//Google login
passport.use(new GoogleStrategy({
	returnURL: 'http://localhost:3000/auth/google/return',
	realm: 'http://localhost:3000/'
},
//callback invoked on success authentication
function (identifier, profile, done) {
	profile.identifier = identifier;
	return done(null, profile);
}));

app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());
app.use(session({
	secret: 'unguessable',
	store: new RedisStore({
		client: redisClient
	})
}));
app.use(passport.initialize());
app.use(passport.session());

//static pages of html, css, js
app.use(express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/bower_components'));

const config = {
	bookdb: 'http://localhost:5984/books/',
	b4db: 'http://localhost:5984/b4/'
};
require('./lib/book-search.js')(config, app);
require('./lib/field-search.js')(config, app);
require('./lib/bundle.js')(config, app);

//Routes to handle endpoints for three types of requests:
//initiating authentication, returnURL after authen
// and logging out
//authenticate() redirects to google signin page and
//processes tokens on return back to app
app.get('/auth/google/:return?',
	passport.authenticate('google', { successRedirect: '/' })
);
//logout() clear session cookies and assciated data
app.get('/auth/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

//Middleware function that enforces our passport session
//call next or give RESTful response
//isAuthenticated() method in passport
//incoming session cookies must match known session then next() 
const authed = function (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	//redis is ready but user not authenticated
	} else if (redisClient.ready) {
		res.json(403, {
			error: "forbidden",
			reason: "not_authenticated"
		});
	} else {
		res.json(503, {
			error: "service_unavailable",
			reason: "authentication_unavailable"
		});
	}
};
//Endpoint returns basic information about the user(id)
//authed: middleware applied to the route
//return object from deserializedUser() callback
app.get('/api/user', authed, function (req, res) {
	res.json(req.user);
});
//Endpoint with object that maps bundle IDs to bundle names
app.get('/api/user/bundles', authed, function (req, res) {
	//couchdb b4 database root and identifier for session
	//schema: user docs in b4 will have same _id as goggle identifier
	let userURL = config.b4db + encodeURIComponent(req.user.identifier);
	request(userURL, function(err, couchRes, body) {
		if (err) {
			res.json(502, {
				error: "bad_gateway",
				reason: err.code
			});
		} else if (couchRes.statusCode === 200) {
			res.json(JSON.parse(body).bundles || {});
		} else {
			res.send(couchRes.statusCode, body);
		}
	});
});
//Endpoint to overwrite the bundle mapping object with provided JSON body
//providing two middleware functions in an array
//bodyParser() parses incoming request content body when the Content-Type
//header is set to application/json, making req.body an object not just buffer
app.put('/api/user/bundles', [authed, bodyParser()], function (req, res) {
	let userURL = config.b4db + encodeURIComponent(req.user.identifier);
	request(usrURL, function (err, couchRes, body) {
		if (err) {
			res.json(502, {
				error: "bad_gateway",
				reason: err.code
			});
		} else if (couchRes.statusCode === 200) {
			let user = JSON.parse(body);
			user.bundles = req.body;
			//pipe() will send a response fwd to res
			request.put({
				url: userURL,
				json: user
			}).pipe(res);
		} else if (couchRes.statusCode === 404) {
			let user = { bundles: req.body };
			request.put({
				url: userURL,
				json: user
			}).pipe(res);
		} else {
			res.send(couchRes.statusCode, body);
		}
	});
});

app.listen(3000, function () {
	console.log("Ready to launch the heat");
});