"use strict";

var Reflux = require('reflux');

module.exports = Reflux.createActions([
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
	'requestVersions',
	'popoverOpened',
	'requestPopoverData',
	'popoverClosed',
	'popoverUpdate',

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
