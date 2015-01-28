"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newResult',
	'updateResult',
	'removeResult',
	'activateResult',
	'getMoreResult',
	'clearResults',

	'articleName',
	'articlePosition',
	'articleJumpTo',
	'linkOpened',
	'linkClosed',
]);

module.exports = Actions;