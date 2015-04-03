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

	'requestReferences': {asyncResult: true},
	'requestSectionReferences': {asyncResult: true},
	'requestVersions': {asyncResult: true},
	'requestContents': {asyncResult: true},

	'sectionSummaryOpened': {},
	'sectionSummaryClosed': {},
	'requestPopoverData': {asyncResult: true},
	'popoverOpened': {},
	'popoverClosed': {},
	'popoverUpdate': {},
	'popoverMove': {},

	'openSaveDialog': {},
	'closeSaveDialog': {},
	'openLoadDialog': {},
	'closeLoadDialog': {},
	'openPageDialog': {},
	'closePageDialog': {},

	'fetchSavedStates': {},
	'removeSavedState': {},
	'updateSavedStates': {},
	'createSaveFolder': {},
	'removeSaveFolder': {},
	'renameSavedState': {},

	'closeView': {},
	'toggleUnderlines': {},
	'toggleNotes': {},
	'toggleSplitMode': {},
	'deactivateSplitMode': {},
	'togglePrintMode': {},
	'toggleSidebar': {},
	'toggleAdvanced': {},
	'activatePrintMode': {},
	'deactivatePrintMode': {},

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
