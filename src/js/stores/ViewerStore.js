"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var PageStore = require('../stores/PageStore');
var _ = require('lodash');
var Immutable = require('immutable');

module.exports =  Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.listenTo(PageStore, this.pageUpdate);
		this.views = Immutable.fromJS(this.getDefaultData());
	},
	getDefaultData: function(){
		return [this.getDefault(), this.getDefault()];
	},
	pageUpdate: function(state){
		return /*
		// if the active page is removed, we must change active
		var ids = _.map(state.pages, function(p){ return p.id});
		if(ids.length){
			for(var i=0;i<this.views.length; i++){
				if(!_.contains(ids, this.views[i].active_page_id)){
					this.views[0].active_page_id = _.last(ids);
				}
			}
		}*/
	},
	getDefault: function(){
		return {active_page_id: undefined, settings: {}, popovers: {}}
	},
	update: function(){
		this.trigger({views: this.views.toJS()});
	},
	prepPage: function(viewer_id, page_id){
		if(!this.views.getIn([viewer_id, 'settings', page_id])){
			this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id], {});
		}
		if(!this.views.getIn([viewer_id, 'popovers', page_id])){
			this.views = this.views.mergeDeepIn([viewer_id, 'popovers', page_id], {});
		}
	},

	onToggleAdvanced: function(viewer_id, page_id){
		this.prepPage(viewer_id, page_id);
		this.views[viewer_id].settings[page_id].advanced_search = !this.views[viewer_id].settings[page_id].advanced_search;
		this.views[viewer_id] = _.extend({}, this.views[viewer_id]);
		this.update();
	},
	onShowPage: function(viewer_id, page_id, options){
		this.prepPage(viewer_id, page_id);
		var settings = _.extend({}, this.views.getIn([viewer_id, 'settings', 'page_id']), options);
		this.views = this.views.mergeDeepIn([viewer_id], {active_page_id: page_id, settings: settings});
		this.update();
	},
	onPopoverOpened: function(viewer_id, page_id, link_data){
		var self = this;
		this.prepPage(viewer_id, page_id);
		var open = this.views.getIn([viewer_id, 'popovers', page_id], Immutable.List())
		if(!open.contains(link_data.id)){
			this.views = this.views.setIn([viewer_id, 'popovers', page_id], open.push(link_data.id))
		}
		this.update();
	},
	onPopoverClosed: function(viewer_id, page_id, link_id){
		var open = this.views.getIn([viewer_id, 'popovers', page_id]);
		this.views = this.views.setIn([viewer_id, 'popovers', page_id], open.remove(open.indexOf(link_id)));
		this.update();
	}
});
