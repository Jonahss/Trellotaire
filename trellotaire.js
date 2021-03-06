var  request  	 = require('request')
	,url 		 = require('./trellotaire-url')
	,daveShades  = require('./daveShades')
	,pretty		 = require('prettyjson')
	,vars		 = require('./vars.json')
	,cards		 = require('./node-cards')
	,events		 = require('events')
	,util 		 = require('util')
	;

cards.useArc4 = true;

cards.Card.prototype.flip = function(){
	if (!this.id) console.log('trying to flip card with no id');
	daveShades.post(url.build('cards/'+this.id+'/attachments', {url: pic(this), name: this.toString()}), function(error, response, body){});
	daveShades.put(url.build('cards/'+this.id+'/name', {value: this.toString()}), function(error){});
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
cards.from_s = function(s, id){
	if (!s){ return null; }
	
	var vals = s.split(':')
	if (vals.length != 2){
		console.log('invalid string used to create a card:',s);
		return null;
	}
	var card = new this.Card(vals[0], vals[1]);
	card.id = id;
	return card;
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
	if (!prop_path || prop_path == '') { return obj; };
	if (!obj) { return null; };
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

any = function(array, lambda){
	for (var i = 0; i < array.length; i++){
		if (lambda(array[i])){
			return array[i]
		}
	}
	return null;
}

////////////////////

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
	
	ret.reverse = function(){
		if (this.fromPos){
			var params = { pos: this.fromPos }
			if (this.fromList){ params.idList = this.fromList }
			daveShades.put(url.build('cards/'+this.cardId, params), function(error, response, body){
				if (error){ console.log(error); }
			});
		}
		else {
			var action = this;
			daveShades.get(url.build('cards/'+this.cardId+'/pos'), function(error, response, body){
				if (error) { console.log(error) };
				action.fromPos = JSON.parse(body)._value;
				action.reverse();
			})
		}
	};
	
	return ret;
}

var pic = function(card){
	if (card === 'back')
		return "https://s3.amazonaws.com/trellotaire-cards/back.png";
	if (card === 'Draw')
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

var _post_card = function(new_card, name, idList, pic, callback){
	daveShades.post(url.build('cards',{name: name, idList: idList, pos: 'bottom'}), function(error, response, body){
		console.log('add ' + new_card.toString() + ' ' + name);
		new_card.id = JSON.parse(body).id;
			
		daveShades.post(url.build('cards/'+new_card.id+'/attachments', {url: pic, name: "image"}), function(error, response, body){
			if (callback){
				callback(new_card);
			}
		});
	});
}

var post_card_faceup = function(new_card, idList, callback){
	var name = new_card.toString();
	var pic_url = pic(new_card);
	if (typeof new_card == 'string') { new_card = new Object(); };
	_post_card(new_card, name, idList, pic_url, callback);
}

var post_card_facedown = function(new_card, idList, callback){
	_post_card(new_card, '?', idList, pic('back'), function(posted_card){
		daveShades.post(url.build('cards/'+posted_card.id+'/actions/comments', {text: posted_card.toString()}), function(error, response, body){
			callback(posted_card);
		});
	});
}

var flip_card = function(id){
	daveShades.get(url.build('cards/'+id+'/actions'), function(error, response, body){
		var comments = JSON.parse(body);
		if (comments.length == 0) { console.log("cannot flip card, it's not facedown") }
		var comment = comments[0].data.text;
		cards.from_s(comment, id).flip();
	});
}

var load_state = function(board, callback){
	var state = new State();
	daveShades.get(url.build('boards/'+board+'/lists', {cards: 'open', card_fields: 'name,idList'}), function(error, response, body){
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

//This method simulates resuming a game, but doesn't actually resume one, since cards in the deck but not on the board are stored in memory.
//It's the last bit of game state stored by the server.
//This method is just for testing purposes, so one doesn't need to wait for a game to be dealt to test something.
exports.resume = function (boardId){
	
	var deck = new cards.Deck('poker');
	deck.suits = ['spade', 'heart', 'club', 'diamond'];
	deck.shuffleRemaining();
	this.deck = deck;
	
	this.board = boardId;
	
	console.log("resuming game", this.board);
	
	load_state(function(new_state){
		this.state = new_state;
		this.play();
	});
}

var Game = exports.Game = function(boardId){
	events.EventEmitter.call(this);
	
	var deck = new cards.Deck('poker');
	deck.suits = ['spade', 'heart', 'club', 'diamond'];
	deck.shuffleRemaining();
	this.deck = deck;
	
	this.state = new State();
	
	this.board = boardId
	
	console.log("starting game", this.board);
	
	var self = this;
	
	self.clear_board(function(){
		self.deal(function(){
			self.play();
		});
	});
}
util.inherits(Game, events.EventEmitter);

Game.prototype.clear_board = function(callback){

	var close = function(id, callback){
		daveShades.put(url.build('lists/'+id+'/closed', {value: true}), function(error, response, body){
			console.log('close a list: '+body);
			callback();
		});
	};

	daveShades.get(url.build('boards/'+this.board+'/lists'), function(error, response, body){
		var lists = JSON.parse(body);
		debug(body);
		var list_ids = lists.map(function(x){return x.id});
		if (list_ids.length == 0)
			callback();
		var completed = 0;
		list_ids.forEach(function(id){
			close(id, function(){
				completed+=1;
				if (callback && completed >= list_ids.length)
					callback();
			});
		});
	});
};

Game.prototype.deal = function(callback) {

	var cards_on_table = [];
	var state = this.state;
	var board = this.board;
	var deck = this.deck;

	deal_card = function(pile_i){
		var new_card = deck.draw();
		post_card_facedown(new_card, state.pile_ids[pile_i-1], function(new_card){
			cards_on_table[new_card.id] = new_card;
			if (Object.keys(cards_on_table).length == 28)
					finish();
		});
	}

	var add_list = function(callback){
		daveShades.post(url.build('lists', {name: dots(pile_i), idBoard: board, pos:'bottom'}), function(error, response, body){
			var id = JSON.parse(body).id;
			state.pile_ids[pile_i-1] = id;
			
			for(var card_i = 0; card_i < pile_i; card_i++){
				deal_card(pile_i)
			}
			callback();
		});
	}
	
	var add_home_row = function(callback){
		daveShades.post(url.build('lists', {name: 'Home Row', idBoard: board, pos:'top'}), function(error, response, body){
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
	
	var flip_cards = function(cb){
		daveShades.get(url.build('boards/'+board+'/lists', {cards: 'all'}), function(error, response, body){
			var lists = JSON.parse(body);
			lists.forEach(function(list, i){
				if (i === 0) return; //skip home row
				cards_on_table[list.cards[list.cards.length-1].id].flip();
			});
			cb();
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
		console.log('finishing: flipping cards');
		flip_cards(callback);
	}
}

Game.prototype.play = function(){

	var self = this;
	var state = this.state;
	var board = this.board;
	var deck = this.deck;
	
	var check_score = function(home_row){
		var score = 0.0;

		deck.suits.forEach(function(suit){
			var home = any(home_row, function(c){ return c.name.toLowerCase() == suit+'s' });
			score += home.badges.attachments-1; //they start with a blank image attachment
		});
		return score;
	};
	
	var march_of_the_kings = function(){
		console.log('march of the kings');
		state.pile_ids.forEach(function(pile_id){
			for(var i = 0; i < 12; i++){
				var king = new cards.Card(deck.suits[i % 4], 'K');
				post_card_faceup(king, pile_id);
			};
		});
	};

	var to_discard_pile = function(discard_card, callback){
		post_card_faceup(discard_card, state.home_row_id, function(card){
			state.discard_id = card.id;
			daveShades.put(url.build('cards/'+card.id+'/pos', {value: 'top'}), function(error, response, body){
				//Put the 'draw' card at the top of the home row
				daveShades.put(url.build('cards/'+state.draw_id+'/pos', {value: 'top'}), function(error, response, body){
					if (callback){ callback(); };
				});
			});
		});
	}

	var draw = function(callback){
		console.log('draw a card');
		
		//Remove the current 'discard' card
		daveShades.del(url.build('cards/'+state.discard_id), function(error){
			if (error) {console.log(error)};
		});
		
		var new_card;
		try {
			new_card = deck.draw();
		} catch(er) {
			deck.discarded.emptyInto(deck.deck);
			if (deck.deck.length != 0){
				new_card = deck.draw();
			}
		}
		
		if (new_card){
			deck.discard(new_card);
			to_discard_pile(new_card, callback);
		}
	};
	
	var flip_unlocked_card = function(listId){
		daveShades.get(url.build('lists/'+listId+'/cards', {fields: 'name'}), function(error, response,body){
			var list = JSON.parse(body);
			bottom_card = list[list.length-1];
			if (bottom_card && bottom_card.name == '?'){
				flip_card(bottom_card.id);
			}
		});
	};
	
	var replenish_discard_pile = function(action){
		deck.held.push(deck.discarded.pop());
		var previously_discarded = deck.discarded[deck.discarded.length-1];
		if (previously_discarded){
			deck.held.push(previously_discarded);
			to_discard_pile(previously_discarded);
		} else {
			to_discard_pile('Discard')
		}
	};
	
	var used_drawn_card = function(action){
		if_legal(action, function(){
			replenish_discard_pile(action);
		});
	};
	
	var moved_card_between_piles = function(action){
	
		//fromList, fromPos, toList
		var cascading_move = function(fromList, toList, fromPos, callback){
			if (!fromPos) { console.log("ERROR: cascading_move error, 'fromPos' is undefined") };
			daveShades.get(url.build('lists/'+fromList+'/cards'), function(error, response,body){
				var cards = JSON.parse(body)
				cards.some(function(card){
					if (card.pos > fromPos){
						daveShades.put(url.build('cards/'+card.id, {idList: toList, pos: 'bottom'}), function(error, response, body){
							//recurse
							cascading_move(fromList, toList, card.pos, callback)
						});
						return true;
					}
				});
				callback();
			});
		};
		
		var handle_move = function(fromList, toList, fromPos){
			//cascading move
			cascading_move(fromList, toList, fromPos, function(){
				//flip unlocked cards
				flip_unlocked_card(action.fromList);
			});
		}
	
		if_legal(action, function(){
			//sometimes the position value doesn't change when a card is moved, but we want to know what it is
			if (!action.fromPos){
				console.log("no fromPos, had to get current pos")
				daveShades.get(url.build('cards/'+action.cardId+'/pos'), function(error, response, body){
					var pos = JSON.parse(body)._value;
					handle_move(action.fromList, action.toList, pos)
				});
			} 
			else {
				handle_move(action.fromList, action.toList, action.fromPos)
			}
		});
	};
	
	var retired_card = function(action){
		console.log("user is attempting to retire card")
		
		var if_from_bottom = function(action, callback){
			daveShades.get(url.build('lists/'+action.fromList+'/cards'), function(error, response, body){
				var cards = JSON.parse(body);
				if (!cards[cards.length-1] || action.fromPos > cards[cards.length-1].pos){
					callback();
				} else {
					console.log("illegal retirement");
					action.reverse();
				}
			});
		}
		
		
		daveShades.get(url.build('lists/'+state.home_row_id+'/cards'), function(error, response, body){
			var home_row = JSON.parse(body);
			
			var jsonCard = any(home_row, function(c){ return c.id == action.cardId; });
			var cardInQuestion = cards.from_s(jsonCard.name, jsonCard.id);
			var homeInQuestion = any(home_row, function(c){
				var suit = cardInQuestion.suit;
				suit = suit[0].toUpperCase() + suit.slice(1) + 's';
				return c.name == suit;
			});
			
			console.log("did you mean to retire to "+homeInQuestion.name+"?");
			
			var perform_retirement = function(homeCard, card){
				console.log("legal retirement");
				//delete card in question, add picture to homeCard
				daveShades.post(url.build('cards/'+homeCard.id+'/attachments', {url: pic(card), name: card.toString()}), function(error, response, body){});
				daveShades.del(url.build('cards/'+card.id), function(error){});
				
				var score = check_score(home_row) + 1; //add one for the card just retired now
				var king = new cards.Card('spade', 'K');
				console.log('game completion at %'+ (score/(king.getNumericalValue()*4)*100));
				console.log(score + ' ' + king.getNumericalValue() * 4)
				console.log(score == king.getNumericalValue() * 4)
				if (score == king.getNumericalValue() * 4){
					self.emit('win', 'yay');
					march_of_the_kings();
				}
			}
			
			//retired cards must come from the bottom of a pile if coming from a pile other than the home row.
			if (homeInQuestion.badges.attachments == cardInQuestion.getNumericalValue()){
				if (action.withinList){
					perform_retirement(homeInQuestion, cardInQuestion);
				} else {
					if_from_bottom(action, function(){
						perform_retirement(homeInQuestion, cardInQuestion);
						flip_unlocked_card(action.fromList);
					});
				}
			} else {
				console.log("illegal retirement");
				action.reverse();
			}
		});
	}

	var last_active = new Date()
	var monitor_actions = function(){
		if (new Date() - last_active > 3600000){
			daveShades.get(url.build('lists/'+state.home_row_id+'/cards'), function(error, response, body){
				var home_row = JSON.parse(body);
				self.emit('timeout', check_score(home_row));
			});
			return;
		}
		daveShades.get(url.build('boards/'+board+'/actions', {filter: 'updateCard', fields: 'data,type', since: 'lastView'}), function(error, response, body){
			var actions = JSON.parse(body);
			if (actions.length == 0) {setTimeout(monitor_actions, 500)}
			else {
				last_active = new Date();
				actions = actions.filter(is_player_action)
				actions = group(actions, 'data.card.id');
				for(var ac in actions){
					var action = new Action(actions[ac]);
					categorize_action(action);
				};
				
				daveShades.post(url.build('boards/'+board+'/markAsViewed'), function(error, response, body){
					process.nextTick(monitor_actions);
				});
			}
		});
	}

	var is_player_action = function(action){
		return action.memberCreator.id != vars.robotid
	};
	
	var categorize_action = function(action){
		console.log('-------------');
		
		//signature of moving one card within a list
		if (action.withinList){
			console.log('moved one card within list');

			//signature of drawing a card
			if (action.cardId == state.draw_id){
				draw();
				return;
			}
			
			//signature of retiring top card of discard pile
			if (action.cardId == state.discard_id){
				retired_card(action);
				replenish_discard_pile(action);
				return;
			}
			
			action.reverse();
		}
		//signature of moving a card to a new list
		else {
			console.log('moved card between two lists');
			
			//signature of moving a drawn card to a pile
			if (action.cardId == state.discard_id){
				used_drawn_card(action);
				return;
			}
			//signature of moving a card to the home row
			if (action.toList == state.home_row_id){
				retired_card(action);
				return;
			}
			
			//signature of moving a card from one pile to another
			if (action.fromList != state.home_row_id){
				moved_card_between_piles(action);
				return;
			}
			
			action.reverse();
		}
	};
	
	//calls callback if placement is legal, undoes move if illegal
	var if_legal = function(action, callback){

		var legal_order = function(first, second){
	
			second = cards.from_s(second.name);
			if (!second) { //must be something we can't turn into a card, like a facedown card
				return false;
			}
			if (!first) {
				if (second.value == 'K')
					return true;
				return false;
			}
			first = cards.from_s(first.name);
			if (!first) { //must be something we can't turn into a card, like a facedown card
				return false;
			}
			
			if (first.getColor() != second.getColor() && first.getNumericalValue()-1 == second.getNumericalValue()){
				return true;
			}
			
			return false;
		}
	
		console.log('legal placement?');
		
		//legal if placed at the bottom of a list where the card above is one value higher and of the opposite color (take into account that the list may be empty)
		daveShades.get(url.build('lists/'+action.toList+'/cards'), function(error, response, body){
			var cards = JSON.parse(body);
			var last_index = cards.length-1;
			if (cards[last_index].id == action.cardId && legal_order(cards[last_index-1], cards[last_index])){
				debug("it's legal");
				callback();
			} else {
				debug("not legal");
				//move the card to previous list and previous position
				action.reverse();
			}
		});
	}
	
	daveShades.post(url.build('boards/'+board+'/markAsViewed'), function(error, response, body){
		monitor_actions();
	});
}