
var system = require('system');
var fs = require('fs');
var sizes = (system.args[3]||'480,703,928,1135').split(',').map(function(x){
	return x|0;
});

var page = require('webpage').create();
page.content = fs.read(system.args[1]);
page.onLoadFinished = function(){
	var result = page.evaluate(function(sizes){
		var obj = {};
		sizes.forEach(function(size){
			document.getElementsByClassName('legislation-result')[0].style.width=size+"px";
			size = document.getElementsByClassName('legislation')[0].clientWidth;
			obj[size] = Array.prototype.map.call(document.querySelectorAll('[data-hook]'), function(n){ return n.clientHeight; });
		});
		return obj
	}, sizes);
	try{
		console.log(JSON.stringify(result));
		fs.write(system.args[2], JSON.stringify(result), 'w');
	}catch(e){}

	phantom.exit();

};