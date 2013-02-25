var request = require('request'),
	url 	= require('url'),
	und		= require('underscore'),
	pretty	= require('prettyjson'),
	vars	= require('./vars.json'),
	cards	= require('./node-cards');

cards.useArc4 = true;
var deck = new cards.Deck('poker');
deck.shuffleRemaining();
cards.Card.prototype.flip = function(){
	if (!this.id) console.log('trying to flip card with no id');
	request.post(url.build('cards/'+this.id+'/attachments', {url: pic(this), name: this.toString()}), function(error, response, body){
		if (error)
			console.log(error);
	});
};
	
//Utility Functions

debug = function(o){
	var pretty = require('prettyjson')
	try {
		console.log(pretty.render(JSON.parse(o)))
	} catch (e){
		console.log(pretty.render(o));
	}
};

dots = function(i){
	if (i == 0)
		return '0';
	var arr = new Array(i);
	for (var x = 0; x < arr.length; x++)
		arr[x] = '.';
	return arr.join('');
};

group = function(array, prop_path){
	var ret = {};
	console.log(array.length);
	for(var i = 0; i < array.length; i++){
		var key = deep_prop(array[i], prop_path);
		if (!ret[key]){
			ret[key] = new Array();
		}
		ret[key].push(array[i]);
	}
	return ret;
};

deep_prop = function(obj, prop_path){
	if (!prop_path || prop_path == '') { return obj};
	props = prop_path.split('.');
	ret = obj;
	for(var i = 0; i < props.length; i++){
		ret = ret[props[i]];
	}
	return ret;
};

////////////////////
		
var token = "cbabf48114493c41375e84e568dac466ea81876a50fef0e119ffd957406c6040" //"de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";
var board = '50fdfc8929f73b0f2e00147f';
var testing = false;

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

var post_card = function(new_card, idList, pic, callback){
	var name = new_card.toString();
	if (typeof new_card == 'string') { new_card = new Object(); };
	
	request.post(url.build('cards',{name: name, idList: idList}), function(error, response, body){
		if (error) { console.log(error); }
		console.log('add ' + name);
		new_card.id = JSON.parse(body).id;
			
		request.post(url.build('cards/'+new_card.id+'/attachments', {url: pic, name: "image"}), function(error, response, body){
			if (error) { console.log(error) };
			callback(new_card);
		});
	});
}

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
		list_ids.forEach(function(id){
			close(id, function(){
				completed+=1;
				if (completed >= list_ids.length)
					callback();
			});
		});
	});
};

var piles = new Array(7);
for (var x = 0; x < 7; x++){
	piles[x] = new Array();
}
var pile_ids = new Array(7);
var home_row_id;
var draw_id, discard_id, spades_id, hearts_id, clubs_id, diamonds_id;
if(testing){draw_id = '512183de34b467df1f00441c';pile_ids[0] = '512183de2703bfa961004e8e'};

pic = function(card){
	if (card === 'back')
		return "https://s3.amazonaws.com/trellotaire-cards/back.png";
	if (card === 'blue')
		return "https://s3.amazonaws.com/trellotaire-cards/blue.png";
	var val = 'default';
	switch(card.value){
		case 'J':
			val = 'Jack';
			break;
		case 'Q':
			val = 'Queen';
			break;
		case 'K':
			val = 'King';
			break;
		case 'A':
			val = 'Ace';
			break;
		default:
			val = card.value;
	}
	return "https://s3.amazonaws.com/trellotaire-cards/"+val+"+of+"+card.suit+"s.png";
}

deal = function(callback) {

	var cards_on_table = [];

	deal_card = function(pile_i){
		var new_card = deck.draw();
		post_card(new_card, pile_ids[pile_i-1], pic('back'), function(new_card){
			cards_on_table[new_card.id] = new_card;
			if (Object.keys(cards_on_table).length == 28)
					finish();
		});
	}

	var add_list = function(callback){
		request.post(url.build('lists', {name: dots(pile_i), idBoard: board, pos:'bottom'}), function(error, response, body){
			var id = JSON.parse(body).id;
			pile_ids[pile_i-1] = id;
			
			for(var card_i = 0; card_i < pile_i; card_i++){
				deal_card(pile_i)
			}
			callback();
		});
	}
	
	var add_home_row = function(callback){
		request.post(url.build('lists', {name: 'Home Row', idBoard: board, pos:'top'}), function(error, response, body){
			if (error) console.log('error');
			home_row_id = JSON.parse(body).id;
			
			var funcs = [];
			funcs.push(function(callback){
				post_card('Draw', home_row_id, pic('blue'), function(card){
					draw_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card('Discard', home_row_id, pic('blue'), function(card){
					discard_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card('Spades', home_row_id, pic('blue'), function(card){
					spades_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card('Hearts', home_row_id, pic('blue'), function(card){
					hearts_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card('Clubs', home_row_id, pic('blue'), function(card){
					clubs_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card('diamonds', home_row_id, pic('blue'), function(card){
					diamonds_id = card.id;
					callback();
				});
			});
			
			var func_i = 0;
			var do_next = function(){
				if (func_i < funcs.length){
					func_i++;
					funcs[func_i-1](do_next);
				}	
			};
			do_next();
			
			callback();
		});
	};
	
	var populate_piles = function(callback){
		request(url.build('boards/'+board+'/lists', {cards: 'all'}), function(error, response, body){
			if (error) console.log(error);
			var lists = JSON.parse(body);
			lists.forEach(function(list, i){
				if (i === 0) return; //skip home row
				list.cards.forEach(function(card){
					piles[i-1].push(cards_on_table[card.id]);
				});
			});
			console.log('finished populating in-memory piles')
			callback();
		});
	};
	
	var pile_i = 0;
	var execute_next = function(){
		console.log("executing next, pile_i= " + pile_i);
		pile_i += 1;
		if (pile_i < 8) add_list(execute_next);
	}
	add_home_row(execute_next);
	
	var finish = function(){
		console.log('finishing:');
		populate_piles(function(){
			console.log('flipping cards');
			piles.forEach(function(pile){
				pile[pile.length-1].flip();
			});
		});
		
		callback();
	}
}

var play = function(){

	var to_discard_pile = function(discard_card, callback){
		post_card(discard_card, home_row_id, pic(discard_card), function(card){
			discard_id = card.id;
			request.put(url.build('cards/'+card.id+'/pos', {value: 'top'}), function(error, response, body){
				if (error) { console.log(error); }
				//Put the 'draw' card at the top of the home row
				request.put(url.build('cards/'+draw_id+'/pos', {value: 'top'}), function(error, response, body){
					if (error) {console.log(error)};
					if (callback){ callback(); };
				});
			});
		});
	}

	var draw = function(callback){
		console.log('draw a card');
		
		//Remove the current 'discard' card
		request.del(url.build('cards/'+discard_id), function(error){
			if (error) {console.log(error)};
		});
		
		var new_card;
		try {
			new_card = deck.draw();
		} catch(er) {
			deck.discarded.emptyInto(deck.deck);
			new_card = deck.draw();
		}
		
		deck.discard(new_card);
		to_discard_pile(new_card, callback);
	};
	
	var use_drawn_card = function(action_group){
		if (!legal_placement(action_group)){
			undo_placement(action_group);
		}
		else {
			deck.held.push(deck.discarded.pop());
			var previously_discarded = deck.discarded[deck.discarded.length-1];
			if (previously_discarded){
				deck.held.push(previously_discarded);
				to_discard_pile(previously_discarded);
			}
			else {
				//TODO
				//post dummy card
				
				//set discard_id to top discarded card.
			}
				
		}
	};

	var monitor_actions = function(){
		request(url.build('boards/'+board+'/actions', {filter: 'updateCard', fields: 'data,type', since: 'lastView'}), function(error, response, body){
			if (error) {console.log(error)};
			var actions = JSON.parse(body);
			if (actions.length == 0) {setTimeout(monitor_actions, 500)}
			else {
				var actions = JSON.parse(body);
				//debug(actions);
				actions = filter_robot_actions(actions);
				actions = group(actions, 'data.card.id');
				for(var ac in actions){
					validate_action(actions[ac]);
				};
				
				request.post(url.build('boards/'+board+'/markAsViewed'), function(error, response, body){
					if (error) {console.log(error)};
					process.nextTick(monitor_actions);
				});
			}
		});
	}

	var filter_robot_actions = function(actions){
		var deleted = 0;
		for(var ac in actions){
			if (actions[ac].memberCreator.id == vars.robotid){
				delete actions[ac];
				deleted = deleted + 1;
				console.log('ignoring one action');
			}
		}
		actions.length = actions.length - deleted;
		return actions;
	}
	
	var validate_action = function(action_group){
		console.log('-------------');
		//signature of moving one card within a list
		if (action_group.length == 1 && !action_group[Object.keys(action_group)[0]].data.listAfter){
			console.log('moved one card within list');
			var action = action_group[Object.keys(action_group)[0]];

			//signature of drawing a card
			if (action.data.card.id == draw_id){
				draw();
			}
		}
		//signature of moving a card to a new list
		else {
			console.log('moved card between two lists');
			var action = action_group[Object.keys(action_group)[0]];
			//signature of moving a drawn card to a list
			if (action.data.card.id == discard_id){
				use_drawn_card(action_group);
			}
		}
	};
	
	var legal_placement = function(action_group){
		console.log('legal placement filler code');
		return true;
	}
	
	var undo_placement = function(action_group){
		console.log('undo placement filler code');
	}
	
	monitor_actions();
}


request(url.build('members/'+vars.robot+'/notifications'), function(error, response, body){
	if (error)
		console.log(error);
		
	debug(body);
});

clear_board(function(){
	deal(function(){
		play();
	});
});







