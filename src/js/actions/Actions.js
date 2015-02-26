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

	'addToPrint',
	'fetchPrint',
	'removeFromPrint',

	'articlePosition',
	'articleJumpTo',

	'toggleAdvanced',

	'requestReferences',
	'requestSectionReferences',
	'requestVersions',
	'popoverOpened',
	'sectionSummaryOpened',
	'sectionSummaryClosed',
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
	'activatePrintMode',

	'setState',
	'saveState',
	'loadState',
	'loadPrevious'
]);
