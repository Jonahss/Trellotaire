var request = require('request'),
	url 	= require('url'),
	und		= require('underscore'),
	pretty	= require('prettyjson'),
	vars	= require('./vars.json'),
	cards	= require('./node-cards');

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
		
var token = "dede66f209b07f6560140d3ba46a460b016b985196c74e1e064f420c3e425b4a" //"de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";
var board = '50fdfccd2f15f2f54a000a51';

url.base = {
	protocol: 'https',
	slashes: true,
	host: 'api.trello.com',
	hostname: 'api.trello.com',
	base_query: {
			key: vars.key,
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

console.log(url.build('members/'+vars.robotid+'/notifications', {goo:'ga'}));
console.log(url.build('members/'+vars.robotid+'/notifications', {foo:'fa'}));
console.log(url.build('members/'+vars.robotid+'/notifications'));

request(url.build('members/'+vars.robotid+'/notifications'), function(error, response, body){
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

	request(url.build('boards/'+board+'/lists'), function(error, response, body){
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

var piles = new Array(7);

deal = function() {
	var add_list = function(callback){
		request.post(url.build('lists', {name: dots(pile_i), idBoard: board, pos:'bottom'}), function(error, response, body){
			var id = JSON.parse(body).id;
			var new_card_url = url.build('cards',{name: "hey some name", idList: id})
			
			for(var card_i = 0; card_i < pile_i; card_i++){
				request.post(new_card_url, function(error, response, body){
					console.log('add card for pile ' + pile_i);
				});
			}
			callback();
		});
	}
	
	var pile_i = 0;
	var execute_next = function(){
		pile_i += 1;
		console.log("executing next, pile_i= " + pile_i);
		if (pile_i < 8)
			add_list(execute_next);
	}
	execute_next();
}

clear_board(function(){
		deal();
});







