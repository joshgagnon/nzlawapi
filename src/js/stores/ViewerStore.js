"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var PageStore = require('../stores/PageStore');
var _ = require('lodash');

module.exports =  Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.listenTo(PageStore, this.pageUpdate);
		this.views = this.getDefaultData();
	},
	getDefaultData: function(){
		return [this.getDefault(), this.getDefault()];
	},
	pageUpdate: function(state){
		var change = false;
		var ids = _.map(state.pages, function(p){ return p.id});
		if(ids.length){
			for(var i=0;i<this.views.length; i++){
				if(!_.contains(ids, this.views[0].active_page_id)){
					this.views[0].active_page_id = _.last(ids);
					change = true;
				}
			}
		}
		if(change){
			this.update();
		}
	},
	getDefault: function(){
		return {active_page_id: undefined, settings: {}}
	},
	update: function(){
		this.trigger({views: this.views});
	},
	onToggleAdvanced: function(viewer_id, page_id){
		this.views[viewer_id] = this.views[viewer_id] || this.getDefault();

		this.views[viewer_id].settings[page_id] = this.views[viewer_id].settings[page_id] || {};
		this.views[viewer_id].settings[page_id].advanced_search = !this.views[viewer_id].settings[page_id].advanced_search;
		this.update();
	},
	onShowPage: function(viewer_id, page_id, options){
		this.views[viewer_id] = this.views[viewer_id] || this.getDefault();
		this.views[viewer_id].active_page_id = page_id;
		this.views[viewer_id].settings[page_id] = _.extend({}, this.views[viewer_id].settings[page_id], options);
		this.update();
	}
});
