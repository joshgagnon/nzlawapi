"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newPage',
	'requestPage',
	'updatePage',
	'removePage',
	'getMorePage',
	'clearPages',
	'showPage',

	'articleName',
	'articlePosition',
	'articleJumpTo',

	'toggleAdvanced',

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