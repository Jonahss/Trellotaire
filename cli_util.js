var request = require('request'),
	url 	= require('url'),
	und		= require('underscore'),
	pretty	= require('prettyjson');

//Utility Functions

debug = function(o){
	var pretty = require('prettyjson')
	try {
		console.log(pretty.render(JSON.parse(o)))
	} catch (e){
		console.log(o);
	}
};

dots = function(i){
	var arr = new Array(i);
	for (var x = 0; x < arr.length; x++)
		arr[x] = '.';
	return arr.join('');
};

var robotid = "daveshades";
var key = "7c4a64bfd8a154965bd35714224a344e";
var token = "dede66f209b07f6560140d3ba46a460b016b985196c74e1e064f420c3e425b4a" //"de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";

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

exports.board = function(){
	request(url.build('boards/50fdfccd2f15f2f54a000a51/lists'), function(error, response, body){
		debug(body);
	});
}