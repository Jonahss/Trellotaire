var OAuth = require('oauth').OAuth,
	http  = require('http'),
	url   = require('url'),
	vars  = require('./vars.json'),
	fs    = require('fs');
	
var server = http.createServer()

server.on('request', function(request, response){

	
		
		console.log(request.url);
	if (/^\/login/.test(request.url)){
		login(request, response);
	}
	else if (/^\/cb/.test(request.url)){
		cb(request, response);
	}

/*
	if(request.path == '/new')
		redirect_to_new_game();

	//obvs we want to cache the page, but for now it's easier not to
	fs.readFile('lobby.html', function(err, data){
		response.end(err || data);
	});
	
*/
});

server.listen('8080');
console.log('server running');


/************************************/

var redirect_to_new_game = function(){
	
}



//Trello redirects the user here after authentication
var loginCallback = "http://localhost:8080/cb";

//need to store token: tokenSecret pairs; in a real application, this should be more permanent (redis would be a good choice)
var oauth_secrets = {};

var oauth = new OAuth(vars.OAUTH.requestURL, vars.OAUTH.accessURL, vars.key, vars.secret, "1.0", loginCallback, "HMAC-SHA1");

var login = function(req, res){
    oauth.getOAuthRequestToken(function(error, token, tokenSecret, results){
		oauth_secrets[token] = tokenSecret;
		console.log(oauth_secrets);
		res.writeHead(302, { 'Location': vars.OAUTH.authorizeURL+"?oauth_token="+token+"&name="+vars.appName });
		res.end();
	});
};

var cb = function(req, res){
  var query = url.parse(req.url, true).query

  var token = query.oauth_token
  var tokenSecret = oauth_secrets[token]
  var verifier = query.oauth_verifier

  oauth.getOAuthAccessToken(token, tokenSecret, verifier, function(error, accessToken, accessTokenSecret, results){
  console.log("accessToken", accessToken);
  console.log("accessTokenSecret", accessTokenSecret);
  //in a real app, the accessToken and accessTokenSecret should be stored
     oauth.getProtectedResource("https://api.trello.com/1/members/me", "GET", accessToken, accessTokenSecret, function(error, data, response){
       //respond with data to show that we now have access to your data
       res.end(data)
    });
  });
};