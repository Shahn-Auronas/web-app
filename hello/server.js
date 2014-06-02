#!/usr/bin/env node --harmony

/*
 * Ch7 of Node the Right Way from Pragmatic Bookshelf.
 * per their Copyrights. 
 * Basic "hello" server
 */

 'use strict';

 const express = require('express'),
       morgan = require('morgan'),
       redisClient = require('redis').createClient(),
       RedisStore = require('connect-redis')(express),
       app = express();

app.use(morgan('dev'));
app.use(express.cookieParser());
app.use(express.session({
	secret: 'unguessable',
	store: new RedisStore({
		client: redisClient
	})
}));

app.get('/api/:name', function (req, res) {
	res.json(200, { "hello": req.param.name });
});

app.listen(3000, function () {
	console.log("Let us begin nice and slow like...");
});