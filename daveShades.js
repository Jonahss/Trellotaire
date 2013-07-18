var oa = require('oauth'),
    vars = require('./vars.json');

var oauth = new oa.OAuth(vars.OAUTH.requestURL, vars.OAUTH.accessURL, vars.key, vars.secret, "1.0", null, "HMAC-SHA1");
//daveShades is the name of our robotic user
var daveShades = {}

daveShades._performSecureRequest = function(method, url, cb){
	//node-oauth and node-request have different parameter orderings, i want to be able to use them interchangeably
    var callback = function(err, data, response){
		//convenient place to put this default error checking
		if (err) {
			console.log("errorfor url:",url,"error:", err.message);
		}
		cb(err, response, data);
	}
	oauth._performSecureRequest(vars.OAUTH.accessToken, vars.OAUTH.accessTokenSecret, method, url, null, "", null, callback);
};
daveShades.get = function(url, cb){
	daveShades._performSecureRequest('GET', url, cb)
};
daveShades.put = function(url, cb){
	daveShades._performSecureRequest('PUT', url, cb)
};
daveShades.post = function(url, cb){
	daveShades._performSecureRequest('POST', url, cb)
};
daveShades.del = function(url, cb){
	daveShades._performSecureRequest('DELETE', url, cb)
};

module.exports = daveShades