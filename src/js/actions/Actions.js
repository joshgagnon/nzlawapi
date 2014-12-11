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


module.exports = Actions;