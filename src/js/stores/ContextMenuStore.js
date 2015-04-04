"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');

module.exports = Reflux.createStore({
	listenables: Actions,
	init: function(){
	},
	onContextMenuOpened: function(viewer_id, page_id, data, position){
		this.context_menu = Immutable.fromJS({
			viewer_id: viewer_id,
			page_id: page_id,
			data: data,
			position: position
		});
		this.update();
	},
	onContextMenuClosed: function(){
		this.context_menu = null;
		this.update();
	},
	update: function(){
		this.trigger({'context_menu': this.context_menu});

	}
});
