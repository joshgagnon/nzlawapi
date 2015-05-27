"use strict";

var Reflux = require('reflux');

module.exports = Reflux.createActions({
    'queryChange': {},

    'newPage': {},
    'requestPage': {children: ['completed', 'failure']},
    'replacePage': {},

    'removePage': {},
    'getMorePage': {children: ['completed', 'failure']},
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

    'requestSubResource': {children: ['completed', 'failure']},

    'sectionSummaryOpened': {},
    'sectionSummaryClosed': {},
    'requestPopoverData': {children: ['completed', 'failure']},
    'popoverOpened': {},
    'popoverClosed': {},
    'popoverUpdate': {},
    'popoverMove': {},

    'contextMenuOpened': {},
    'contextMenuClosed': {},

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

    'toggleUnderlines': {},
    'toggleNotes': {},

    'toggleSplitMode': {},
    'deactivateSplitMode': {},

    'openViewFull': {},
    'openViewSplit': {},
    'closeView': {},


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
    'closeNotification' : {},

    'clearError': {},
    'setError': {}
});
