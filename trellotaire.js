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

////////////////////
	
//TODO: these can be put into a config file (which is actually just a json file we 'require')	
var robotid = "daveshades";
var key = "7c4a64bfd8a154965bd35714224a344e";
var token = "d20b755635fd5ac839b8221b366f67356c8f9478a87157409496786d283156ec" //"de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";

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
		
	debug(body);
})

var clear_board = function(callback){

	var close = function(id, callback){
		request.put(url.build('lists/'+id+'/closed', {value: true}), function(error, response, body){
			if (error)
				console.log(error);
			console.log('close a list: '+body);
			callback();
		});
	};

	request(url.build('boards/50fdfccd2f15f2f54a000a51/lists'), function(error, response, body){
		if (error)
			console.log(error);
		
		var lists = JSON.parse(body);
		debug(body);
		var list_ids = lists.map(function(x){return x.id});
		if (list_ids.length == 0)
			callback();
		var completed = 0;
		list_ids.forEach(function(id){ //manual implementation of async.forEach(); for funsies
			close(id, function(){
				completed+=1;
				if (completed >= list_ids.length)
					callback();
			});
		});
	});
};

fill_board = function(i, callback){
	var completed = 0;
	for (var x = 0; x < i; x++){
		request.post(url.build('lists', {name:'List'+x, idBoard:'50fdfccd2f15f2f54a000a51'}), function(){
			completed+=1;
			if (completed >= i)
				setTimeout(callback, 15000);
		});
	}
}

//test clearing
clear_board(function(){
	fill_board(10, function() {
		clear_board(function(){
			for (var x = 0; x < 7; x++){
				request.post(url.build('lists', {name: dots(x), idBoard:'50fdfccd2f15f2f54a000a51', pos: x}), function(){
					
				});
			}
		});
	});
});
/*
for (var x = 0; x < 7; x++){
	request.post(url.build('lists', {name: dots(x), idBoard:'50fdfccd2f15f2f54a000a51'}), function(){
		
	});
}
*/





