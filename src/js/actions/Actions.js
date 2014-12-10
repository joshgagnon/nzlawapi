"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
		'typeChange',
		'queryChange',
		'resultRequest',
		'resultLoading',
		'resultSuccess',
		'resultFailure',
		'newResult',
		'fetchActs'
	]);


var fetch = _.debounce(function(url, data){
	return $.get(url, data || {});
}, 300);

var fetch = function(data){
	var params = {};
	var url = '/' + data.type;
	console.log(data)
	if(data.type === 'act'){
		url += '/' + data.act.replace(/ /g, '');
		if(data.act_find === 'search'){
			url += '/' + data.query;
		}
	}
	return $.get(url, params);
}

Actions.resultRequest.preEmit = function(data){
	Actions.resultLoading({loading: true});
	fetch(data)
		.then(
			function(response){
				var result = $(response).find('.result').parent().html();
				Actions.newResult({id: Math.random(), content: result})
			},
			Actions.resultFailure
			)
		//.always(Actions.resultDone)
}



module.exports = Actions;