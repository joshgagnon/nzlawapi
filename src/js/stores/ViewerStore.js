"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var PageStore = require('../stores/PageStore');
var _ = require('lodash');

module.exports =  Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.listenTo(PageStore, this.pageUpdate);
		this.active_page_ids = [];
		this.pages = [];
	},
	pageUpdate: function(state){
		var change = false;
		var ids = _.map(state.pages, function(p){ return p.id});
		if(ids.length){
			for(var i=0;i<this.active_page_ids.length; i++){
				if(!_.contains(ids, this.active_page_ids[i])){
					this.active_page_ids[i] = _.last(ids);
					change = true;
				}
			}
		}
		if(change){
			this.update();
		}
	},
	update: function(){
		this.trigger({active_page_ids: this.active_page_ids});
	},
	onShowPage: function(viewer_id, page_id){
		this.active_page_ids[viewer_id] = page_id;
		this.update();
	}
});
