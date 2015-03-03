var system = require('system');
var fs = require('fs');

var sizes = (system.args[3]||'480,768,992,1200').split(',').map(function(x){
	return x|0;
});

var page = require('webpage').create();
page.content = fs.read(system.args[1]);
var result = page.evaluate(function(sizes){
	var obj = {};
	sizes.forEach(function(size){
		document.getElementsByClassName('legislation-result')[0].style.width=size+"px";
		obj[size] = Array.prototype.map.call(document.querySelectorAll('[data-hook]'), function(n){ return n.clientHeight; });
	});
	return obj
}, sizes);
page.content = fs.write(system.args[2], JSON.stringify(result), 'w');
phantom.exit();

