//TODO change how flipping works to fit this change.
//TODO change the home-row cards. hate that code anyways.

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
		if (error) { console.log(error) };
	});
	request.put(url.build('cards/'+this.id+'/name', {value: this.toString()}), function(error){
		if (error) { console.log(error) };
	});
};
cards.Card.prototype.toString = function(){
	return this.suit + ':' + this.value;
}
cards.Card.prototype.getColor = function(){
	if (this.suit == 'spade' || this.suit == 'club')
		return 'black';
	if (this.suit == 'heart' || this.suit == 'diamond')
		return 'red'
	return null;
}
cards.Card.prototype.getNumericalValue = function(){
	switch (this.value) {
		case 'A':
			return 1;
		case 'J':
			return 11;
		case 'Q':
			return 12;
		case 'K':
			return 13;
		default:
			return this.value;
	}
}
cards.from_s = function(s){
	if (!s){ return null; }
	
	var vals = s.split(':')
	if (vals.length != 2){
		console.log('invalid string used to create a card');
		return null;
	}
	return new this.Card(vals[0], vals[1]);
}
	
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

to_map = function(array, lambda){
	var map = {};
	for (var i = 0; i < array.length; i++){
		map[lambda(array[i])] = array[i];
	}
	return map;
}

////////////////////
		
var token = "9a63ea757e69206c7b3183777ad154b68cea92662e14ac8390e6c37228e7a10b" //"de5e086ed809ae768099b68609ae965487af159faca92f6a95f1469cb5733dbc";
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

var State = function(){ return {
	piles: (function(){
				var piles = new Array(7);
				for (var x = 0; x < 7; x++){
					piles[x] = new Array();
				}
				return piles;
			})(),
	pile_ids: new Array(7),
	home_row_id: null,
	draw_id: null,
	discard_id: null,
	spades_id: null,
	hearts_id: null,
	clubs_id: null,
	diamonds_id: null
}}
var state = new State();

var Action = function(action_group){
	var ret = new Object();
	var movement_action;
	for(var action in action_group){
		ret.cardId = action_group[action].data.card.id;
		if (action_group[action].data.listAfter){
			movement_action = action_group[action];
			ret.betweenLists = true;
			ret.fromList = movement_action.data.listBefore.id;
			ret.toList = movement_action.data.listAfter.id;
			continue;
		}
		if (action_group[action].data.old.pos){
			ret.fromPos = action_group[action].data.old.pos;
		}
	}
	
	if (!movement_action){
		ret.withinList = true;
	}
	debug('creating action')
	return ret;
}

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



cards.cardFromString = function(s){
	
}

var _post_card = function(new_card, name, idList, pic, callback){
	request.post(url.build('cards',{name: name, idList: idList}), function(error, response, body){
		if (error) { console.log(error); }
		console.log('add ' + new_card.toString());
		new_card.id = JSON.parse(body).id;
			
		request.post(url.build('cards/'+new_card.id+'/attachments', {url: pic, name: "image"}), function(error, response, body){
			if (error) { console.log(error) };
			callback(new_card);
		});
	});
}

var post_card_faceup = function(new_card, idList, callback){
	var name = new_card.toString();
	if (typeof new_card == 'string') { new_card = new Object(); };
	_post_card(new_card, name, idList, pic(new_card), callback);
}

var post_card_facedown = function(new_card, idList, callback){
	_post_card(new_card, '?', idList, pic('back'), callback);
}

var load_state = function(callback){
	var state = new State();
	request(url.build('boards/'+board+'/lists', {cards: 'open', card_fields: 'name,idList'}), function(error, response, body){
		if (error) { console.log(error) }
		var lists = JSON.parse(body);
		lists = to_map(lists, function(x){ return x.name });
		
		//Populate hom_row_id and the cards within it
		state.home_row_id = lists["Home Row"].id;
		var home_row_cards = to_map(lists["Home Row"].cards, function(x){ return x.name.toLowerCase() })
		var names = ['draw', 'discard', 'spades', 'hearts', 'clubs', 'diamonds'];
		names.forEach(function(name){
			state[name+'_id'] = home_row_cards[name]? home_row_cards[name].id : null;
		});
		
		delete lists['Home Row'];
		for(var list in lists){
			if (list){
				state.pile_ids.push(lists[list].id);
			}
		};
		
		console.log('state loaded');
		callback(state);
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

deal = function(callback) {

	var cards_on_table = [];

	deal_card = function(pile_i){
		var new_card = deck.draw();
		post_card_facedown(new_card, state.pile_ids[pile_i-1], function(new_card){
			cards_on_table[new_card.id] = new_card;
			if (Object.keys(cards_on_table).length == 28)
					finish();
		});
	}

	var add_list = function(callback){
		request.post(url.build('lists', {name: dots(pile_i), idBoard: board, pos:'bottom'}), function(error, response, body){
			var id = JSON.parse(body).id;
			state.pile_ids[pile_i-1] = id;
			
			for(var card_i = 0; card_i < pile_i; card_i++){
				deal_card(pile_i)
			}
			callback();
		});
	}
	
	var add_home_row = function(callback){
		request.post(url.build('lists', {name: 'Home Row', idBoard: board, pos:'top'}), function(error, response, body){
			if (error) console.log('error');
			state.home_row_id = JSON.parse(body).id;
			
			var funcs = [];
			funcs.push(function(callback){
				post_card_faceup('Draw', state.home_row_id, function(card){
					state.draw_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card_faceup('Discard', state.home_row_id, function(card){
					state.discard_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card_faceup('Spades', state.home_row_id, function(card){
					state.spades_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card_faceup('Hearts', state.home_row_id, function(card){
					state.hearts_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card_faceup('Clubs', state.home_row_id, function(card){
					state.clubs_id = card.id;
					callback();
				});
			});funcs.push(function(callback){
				post_card_faceup('Diamonds', state.home_row_id, function(card){
					state.diamonds_id = card.id;
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
					state.piles[i-1].push(cards_on_table[card.id]);
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
			state.piles.forEach(function(pile){
				pile[pile.length-1].flip();
			});
		});
		
		callback();
	}
}

var play = function(){

	var to_discard_pile = function(discard_card, callback){
		post_card_faceup(discard_card, state.home_row_id, function(card){
			state.discard_id = card.id;
			request.put(url.build('cards/'+card.id+'/pos', {value: 'top'}), function(error, response, body){
				if (error) { console.log(error); }
				//Put the 'draw' card at the top of the home row
				request.put(url.build('cards/'+state.draw_id+'/pos', {value: 'top'}), function(error, response, body){
					if (error) {console.log(error)};
					if (callback){ callback(); };
				});
			});
		});
	}

	var draw = function(callback){
		console.log('draw a card');
		
		//Remove the current 'discard' card
		request.del(url.build('cards/'+state.discard_id), function(error){
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
	
	var flip_unlocked_card = function(listId){
		request(url.build('lists/'+listId+'/cards', {fields: 'name'}), function(error, response,body){
			var cards = JSON.parse(body);
			bottom_card = cardsp[cards.length-1];
			if (bottom_card.name == '?'){
				flip_card(bottom_card.id);
			}
		});
	};
	
	var used_drawn_card = function(action){
		if_legal(action, function(){
			deck.held.push(deck.discarded.pop());
			var previously_discarded = deck.discarded[deck.discarded.length-1];
			if (previously_discarded){
				deck.held.push(previously_discarded);
				to_discard_pile(previously_discarded);
			} else {
				to_discard_pile('Discard')
			}
		});
	};
	
	var moved_card_between_piles = function(action){
		if_legal(action, function(){
			//waterfall move
			//flip unlocked cards
			flip_unlocked_card(action.fromList);
		});
	};

	var monitor_actions = function(){
		request(url.build('boards/'+board+'/actions', {filter: 'updateCard', fields: 'data,type', since: 'lastView'}), function(error, response, body){
			if (error) {console.log(error)};
			var actions = JSON.parse(body);
			if (actions.length == 0) {setTimeout(monitor_actions, 500)}
			else {
				var actions = JSON.parse(body);
				actions = filter_robot_actions(actions);
				actions = group(actions, 'data.card.id');
				for(var ac in actions){
					var action = new Action(actions[ac]);
					categorize_action(action);
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
			}
		}
		actions.length = actions.length - deleted;
		return actions;
	}
	
	var categorize_action = function(action){
		console.log('-------------');
		debug(action);
		//signature of moving one card within a list
		if (action.withinList){
			console.log('moved one card within list');

			//signature of drawing a card
			if (action.cardId == state.draw_id){
				draw();
			}
		}
		//signature of moving a card to a new list
		else {
			console.log('moved card between two lists');
			
			//signature of moving a drawn card to a pile
			if (action.cardId == state.discard_id){
				used_drawn_card(action);
			}
			//signature of moving a card from one pile to another
			else {
				moved_card_between_piles(action);
			}
		}
	};
	
	//calls callback if placement is legal, undoes move if illegal
	var if_legal = function(action, callback){

		var legal_order = function(first, second){
//TEST
return true;	
			second = cards.from_s(second.name);
			if (!first) {
				if (second.value == 'K')
					return true;
				return false;
			}
			first = cards.from_s(first.name);
			if (first.getColor() != second.getColor() && first.getNumericalValue()-1 == second.getNumericalValue()){
				return true;
			}
			
			return false;
		}
	
		console.log('legal placement?');
		
		//legal if placed at the bottom of a list where the card above is one value higher and of the opposite color (take into account that the list may be empty)
		request(url.build('lists/'+action.toList+'/cards'), function(error, response, body){
			var cards = JSON.parse(body);
			var last_index = cards.length-1;
			if (cards[last_index].id == action.cardId && legal_order(cards[last_index-1], cards[last_index])){
				debug("it's legal");
				//TODO move entire stack beneath moved card
				//waterfall/recursive function. call a move, detect the move with this function
				callback();
			} else {
				debug("not legal");
				//move the card to previous list and previous position
				request.put(url.build('cards/'+action.cardId, {idList: action.fromList, pos: action.fromPos}), function(error, response, body){
					if (error){ console.log(error); }
				});
			}
		});
	}
	
	request.post(url.build('boards/'+board+'/markAsViewed'), function(error, response, body){
		if (error) {console.log(error)};
		monitor_actions();
	});
}

request(url.build('members/'+vars.robot+'/notifications'), function(error, response, body){
	if (error)
		console.log(error);
		
	debug(body);
});


load_state(function(new_state){
	state = new_state;
	var x = cards.from_s("club:7")
	post_card_faceup(x, state.home_row_id, function(card){
		state.discard_id = card.id;
		play();
	});
});

/*
clear_board(function(){
	deal(function(){
		play();
	});
});

*/






