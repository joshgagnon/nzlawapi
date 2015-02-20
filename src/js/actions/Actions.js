"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newPage',
	'newAdvancedPage',
	'requestPage',
	// /'updatePage',
	'removePage',
	'getMorePage',
	'clearPages',
	'showPage',

	'articleName',
	'articlePosition',
	'articleJumpTo',

	'toggleAdvanced',

	'requestReferences',
	'popoverOpened',
	'requestPopoverData',
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