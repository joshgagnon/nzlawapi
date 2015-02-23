"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');


var Actions = Reflux.createActions([
	'queryChange',

	'newPage',
	'newAdvancedPage',
	'requestPage',

	'removePage',
	'getMorePage',
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
	'createSaveFolder',
	'removeSaveFolder',
	'renameSavedState',


	'toggleUnderlines',
	'toggleSplitMode',
	'togglePrintMode',

	'setState',
	'saveState',
	'loadState',
	'loadPrevious'
]);

module.exports = Actions;