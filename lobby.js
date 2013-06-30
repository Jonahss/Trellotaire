var trellotaire = require('./trellotaire'),
	daveShades = require('./daveShades.js'),
	oauth = require('oauth'),
	http  = require('http'),
	vars  = require('./vars.json'),
	url   = require('./trellotaire-url'),
	fs    = require('fs');
	
//TODO: make this a datastore, not just in-mem
var oauth_secrets = {};
var server = http.createServer();

server.on('request', function(request, response){

	if(request.url == '/new')
		redirect_to_oauth(response);
	
	else if (/^\/cb\//.test(request.url)){
		var boardId = url.parse(request.url, true).pathname.slice(4);
		var query = url.parse(request.url, true).query;
		var token = query.oauth_token;
		var token_secret = oauth_secrets[token];
		var oauth_verifier = query.oauth_verifier;
		redirect_to_board(boardId, token, token_secret, oauth_verifier, response);
	}
	
	else
	
	//obvs we want to cache the page, but for development its easier to test this way
	fs.readFile('lobby.html', function(err, data){
		response.end(err || data);
	});
	

});

server.listen('8080');
console.log('server running');


/************************************/

var redirect_to_oauth = function(server_response){
	
	var board_args = {
		name: 'Trellotaire',
		desc: 'solitaire in Trello',
		prefs_permissionLevel: 'public'
	}

	daveShades.post(url.build('boards', board_args), function(err, response, body){
		var data = JSON.parse(body);
		var new_game = new trellotaire.Game(data.id);


		var oauthCallback = 'http://localhost:8080/cb/' + data.id
		var o = new oauth.OAuth(vars.OAUTH.requestURL, vars.OAUTH.accessURL, vars.key, vars.secret, "1.0", oauthCallback, "HMAC-SHA1");
		o.getOAuthRequestToken(function(error, token, tokenSecret, results){
			oauth_secrets[token] = tokenSecret;

			server_response.writeHead(302, { 'Location': vars.OAUTH.authorizeURL+"?oauth_token="+token+"&name="+vars.appName+"&scope=read" });
			server_response.end();
		});
		
	});
}

var redirect_to_board = function(boardId, token, token_secret, oauth_verifier, server_response){
	var boardUrl = 'https://trello.com/board/trellotaire/' + boardId;

	var o = new oauth.OAuth(vars.OAUTH.requestURL, vars.OAUTH.accessURL, vars.key, vars.secret, "1.0", "", "HMAC-SHA1");
  	o.getOAuthAccessToken(token, oauth_secrets[token], oauth_verifier, function(error, accessToken, accessTokenSecret, results){
		//get the players trello member id
		o.get("https://api.trello.com/1/members/me", accessToken, accessTokenSecret, function(error, data, response){
       		//add the player to the new board
       		daveShades.put(url.build('boards/'+boardId+'/members/'+JSON.parse(data).id, {type: 'normal'}), function(err, response, body){
       			console.log("player added to board");
       		});
    	});

  	});
  


	server_response.writeHead(302, { 'Location': boardUrl });
	server_response.end();
}