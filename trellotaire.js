var request = require('request'),
	url 	= require('url'),
	und		= require('underscore');

var robotid = "daveshades";
var key = "7c4a64bfd8a154965bd35714224a344e";
var token = "de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";

url.base = {
	protocol: 'https',
	slashes: true,
	host: 'api.trello.com',
	hostname: 'api.trello.com',
	base_query: {
			key: key,
			token: token
		   },
	base_pathname: '/1/'
};

url.build = function(path, query){
	var url = this.base;
	url.pathname = url.base_pathname + path;
	if(query){
		url.query = und.extend({}, url.base_query, query);
	} else {
		url.query = url.base_query;
	};
	return this.format(url);
};

console.log(url.build('members/'+robotid+'/notifications', {goo:'ga'}));
console.log(url.build('members/'+robotid+'/notifications', {foo:'fa'}));
console.log(url.build('members/'+robotid+'/notifications'));

request(url.build('members/'+robotid+'/notifications'), function(error, response, body){
	if (error)
		console.log(error);
		
	console.log(body);
})
