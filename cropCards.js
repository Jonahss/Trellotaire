var im = require('imagemagick')
var fs = require('fs');

fs.readdir('./Originals', function(err, files){
	if (err)
		console.log(err);
	files.forEach(function(file){
		im.crop({
		  srcPath: './Originals/'+file,
		  dstPath: file,
		  width: 199,
		  height: 135,
		  quality: 1,
		  gravity: "North"
		}, function(err, stdout, stderr){
		  if (err)
			console.log(err);
		});
	});
});