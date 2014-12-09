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
		'resultFailure'
	]);


var fetch = _.debounce(function(url, data){
	return $.get(url, data || {});
}, 300);

var fetch = function(data){
	var params = {};
	var url = '/' + data.type;
	console.log(data)
	if(data.type === 'act'){
		url += '/' + data.act;
	}
	return $.get(url, params);

}

Actions.resultRequest.preEmit = function(data){
	Actions.resultLoading({loading: true});
	fetch(data)
		.then(
			Actions.resultSuccess,
			Actions.resultFailure
			)
		//.always(Actions.resultDone)
}



module.exports = Actions;