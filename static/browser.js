$(document).on('ready', function(){

	$.get('/acts.json')
	.then(function(data){
		console.log(data);
	})
});