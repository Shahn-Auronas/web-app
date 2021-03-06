/*
 * Republished from Pragmatic Bookshelf as part of Node.js the Right Way
 * per their Copyrights.
 * 
 * curl http://localhost:3000/api/search/author?q=Giles
 * culr http://localhost:3000/api/search/subject?q=Croc
 */

 'use strict';

 const request = require('request');

 module.exports = function (config, app) {
 	//register a route with the express app
 	app.get('/api/seearch/:view', function (req, res) {
 		//callback makes a request to CouchDB
 		request({
 			method: 'GET',
 			url: config.bookdb + '_design/books/_view/by_' + req.params.view,
 			//query string param to limit results
 			qs: {
 				startkey: JSON.stringify(req.query.q),
 				endkey: JSON.stringify(req.query.q + '\ufff0'),
 				group: true
 			}
 		}, function (err, couchRes, body) {
 			//couldn't connect to CouchDB
 			if (err) {
 				res.json(502, {
 					error: "bad_gateway",
 					reason: err.code
 				});
 				return;
 			}
 			//CouchDB couldn't process our request
 			if (couchRes.statusCode !== 200) {
 				res.json(couchRes.statusCode, JSON.parse(body));
 				return;
 			}
 			//send back just the keys we got back from CouchDB
 			res.json(JSON.parse(body).rows.map(function (elem) {
 				return elem.key;
 			}));
 		});
 	});
 };