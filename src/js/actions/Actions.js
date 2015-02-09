"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newResult',
	'updateResult',
	'removeResult',
	'getMoreResult',
	'clearResults',
	'activateResult',

	'articleName',
	'articlePosition',
	'articleJumpTo',

	'requestReferences',
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