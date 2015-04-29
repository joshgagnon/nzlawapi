"use strict";
// TODO, es6 symbols, defaults
module.exports = {
	PAGE_TYPES: {
		INSTRUMENT: 'instrument',
		CASE: 'case',
		SEARCH: 'search',
		DEFINITION: 'definition',
		SECTION_REFERENCES: 'section_references',
	},
	SEARCH_TYPES: {
		LIST: 'list',
		DEFINITION: 'definition',
		CONTAINS_LIST: 'contains_list',
		CONTAINS_RESULT: 'contains_result'
	},
	POPOVER_TYPES: {
		DEFINITION: 'definition',
		LINK: 'link',
		LOCATION: 'location',
		SECTION_SUMMARY: 'section_summary',
		SECTION_REFERENCES: 'section_references'
	},
	CONTEXT_MENU_TYPES: {
		LOCATION: 'location'
	},
	DRAG_TYPES: {
		POPOVER: 'popover'
	}
};