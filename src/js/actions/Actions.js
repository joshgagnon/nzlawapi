"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
		'queryChange',
		'newResult',
		'removeResult'
	]);


module.exports = Actions;