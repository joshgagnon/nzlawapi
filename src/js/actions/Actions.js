"use strict";

var Reflux = require('reflux');

module.exports = Reflux.createActions({
	'queryChange': {},

	'newPage': {},
	'newAdvancedPage': {},
	'requestPage': {asyncResult: true},
	'replacePage': {},

	'removePage': {},
	'getMorePage': {asyncResult: true},
	'showPage': {},
	'showNewPage': {},

	'reset': {},

	'addToPrint': {},
	'fetchPrint': {},
	'removeFromPrint': {},
	'printMovePosition': {},

	'articlePosition': {},
	'articleJumpTo': {},
	'articleFocusLocation': {},
	'toggleAdvanced': {},

	'requestReferences': {asyncResult: true},
	'requestSectionReferences': {asyncResult: true},
	'requestVersions': {asyncResult: true},
	'requestContents': {asyncResult: true},

	'popoverOpened': {},
	'sectionSummaryOpened': {},
	'sectionSummaryClosed': {},
	'requestPopoverData': {asyncResult: true},
	'popoverClosed': {},
	'popoverUpdate': {},

	'openSaveDialog': {},
	'closeSaveDialog': {},
	'openLoadDialog': {},
	'closeLoadDialog': {},

	'fetchSavedStates': {},
	'removeSavedState': {},
	'updateSavedStates': {},
	'createSaveFolder': {},
	'removeSaveFolder': {},
	'renameSavedState': {},


	'toggleUnderlines': {},
	'toggleSplitMode': {},
	'togglePrintMode': {},
	'activatePrintMode': {},

	'setState': {},
	'saveState': {},
	'loadState': {},
	'loadPrevious': {},
	'loadedFromStorage': {},

	'userAction': {},
	'goForward': {},
	'goBack': {},

	'notify': {},
	'closeNotification' : {}
});
