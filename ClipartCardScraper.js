var request = require('request'),
	cheerio = require('cheerio'),
	fs		= require('fs');
	cards	= require('./node-cards');
	
var deck = new cards.Deck('poker');
var resolution = 270;

var index_url = function(page_num){
	return 'http://openclipart.org/search/?query=ornamental%20deck&page='+page_num;
}

var url = function(id){
	return 'http://openclipart.org/image/'+resolution+'px/svg_to_png/'+id+'/nicubunu_Ornamental_deck.png'
}

var corrected_value = function(val){
	switch(val){
		case 'J':
			return 'Jack';
		case 'Q':
			return 'Queen';
		case 'K':
			return 'King';
		case 'A':
			return 'Ace';
		default:
			return card.value;
	}
}

for (var i = 1; i < 4; i++){
	request(index_url(i), function(error, response, body){
		if (!error && response.statusCode == 200){
			$ = cheerio.load(body);
			$('.r-img').each(function(i,e){
				var id = this.find('.favorite-icon').attr('id').substring(14);
				var name = this.find('h4 a').html().substring(17);
				console.log('downloading ', name, id);
				request(url(id)).pipe(fs.createWriteStream(name+'.png'));
			});
		}
	});
}





save_comic = function(url){
	request.get(url, function(error, response, body){
		if (!error && response.statusCode == 200){
			$ = cheerio.load(body);
			var comic_src = $('#comic a img').attr('src');
			var next_url = $('#comic a').attr('href');
			var name = comic_src.split('/').pop();
			
			request(comic_src).pipe(fs.createWriteStream('DresdenCodak/'+name));
			
			console.log(name);
			if (url != next_url){
				save_comic(next_url);
			}
		}
	});
}

