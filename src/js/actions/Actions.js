"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newResult',
	'showResult',
	'updateResult',
	'removeResult',
	'activateResult',
	'getMoreResult',
	'clearResults',

	'articleName',
	'articlePosition',
	'articleJumpTo',

	'linkOpened',
	'definitionOpened',
	'popoverClosed',

	'closeSaveDialog',
	'closeLoadDialog',
	'fetchSavedStates',
	'removeSavedState',
	'updateSavedStates',

	'saveState',
	'loadState'
]);

module.exports = Actions;