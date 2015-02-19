"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
//var findText = require('../util/findText.js');




/*function Article(data){
	_.extend(this, data);
	this._submodels = {};
};

Article.prototype.get = function(submodel){
	this._submodels[submodel] = this._submodels[submodel] || {};
	return  this._submodels[submodel];
};*/

var PageStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.pages = [];
		this.counter = 0;
	},
	onUpdatePage: function(page){
		var index = _.indexOf(this.pages, page);
		this.pages[index] = _.extend({}, page);
		this.pages = this.pages.slice();
		this.trigger({pages: this.pages}, page);
	},
	generatePage: function(page){
		page = page || {};
		page.id = 'page-'+this.counter++;
		page.popovers = page.popovers || {};
		this.pages.push(page);
		return page;
	},
	onNewPage: function(page, viewer_id){
		var id;
		if(!_.find(this.pages, {query: page.query})){
			page = this.generatePage(page);
		}
		else{
			page = _.find(this.pages, {query: page.query});
		}
		this.trigger({pages: this.pages});
		Actions.requestPage(page);
		if(viewer_id !== undefined){
			Actions.showPage(viewer_id, page.id);
		}
	},
	onNewAdvancedPage: function(page, viewer_id){
		var page = this.generatePage(page);
		this.trigger({pages: this.pages});
		Actions.showPage(viewer_id, page.id, {advanced_search: true});
	},
	getById: function(id){
		return _.find(this.pages, {id: id});
	},
	onRequestPage: function(page){
		//todo, guards in Action pre emit
		if(!page.fetching && !page.fetched){
			page.fetching = true;
			$.get('/query', page.query)
				.then(function(data){
					page = this.getById(page.id);
					page.fetching = false;
					page.fetched = true;
					page.query.type = data.type;
					if(data.id){
						page.query.id = data.id;
					}
					if(_.contains(this.pages, page)){
						page.content = data;
						if(data.title){
							page.title = data.title;
						}
						Actions.updatePage(page);
					}
				}.bind(this),
				function(response){
					page = this.getById(page.id);
					page.title = 'Error';
					page.content = response.responseJSON || {error: 'A problem occurred'};
					Actions.updatePage(page);
				}.bind(this));
			Actions.updatePage(page);
		}
	},
	onGetMorePage: function(page, to_add){
		page.fetching = true;
		if(!page.finished && page.query.search && page.content.search_results.hits.length){
			$.get('/query', _.extend({offset: page.content.search_results.hits.length}, page.query))
				.then(function(data){
					page = this.getById(page.id);
					page.offset = data.offset;
					page.content.search_results.hits = page.content.search_results.hits.concat(data.search_results.hits);
					page.fetching = false;
					if(page.content.search_results.hits.length >= page.content.search_results.total){
						page.finished = true;
					}
					Actions.updatePage(page);
				}.bind(this),function(){
					page = this.getById(page.id);
					page.finished = true;
					Actions.updatePage(page);
				}.bind(this))
		}
		else if(to_add.requested_parts && to_add.requested_parts.length){
			var to_fetch = _.difference(to_add.requested_parts, page.requested_parts);
			page.requested_parts = _.union(page.requested_parts, to_add.requested_parts);
			if(to_fetch.length){
				$.get('/query', _.defaults({find: 'more', requested_parts: to_fetch}, page.query))
					.then(function(data){
						page = this.getById(page.id);
						page.content.parts = _.extend({}, page.content.parts, data.parts);
						Actions.updatePage(page);
					}.bind(this),function(response){
						page = this.getById(page.id);
						page.content = response.responseJSON || {error: 'A problem occurred'};
						Actions.updatePage(page);
					}.bind(this));
			}
		}
		Actions.updatePage(page);
	},
	onClearPages: function(){
		this.pages = [];
		this.trigger({pages: this.pages})
	},
	onRemovePage: function(page){
		var index = _.findIndex(this.pages, page);
		this.pages = _.without(this.pages, page);
		this.trigger({pages: this.pages}, page);
	},
	onPopoverOpened: function(viewer_id, page, popover){
		var self = this;
		if(!page.popovers[popover.id]){
			page.popovers[popover.id] = popover;
			//TODO, don't update the page
			Actions.updatePage(page);
		}
	},
	onRequestPopoverData: function(page, popover_id){
		//TODO, don't update the page
		var popover = page.popovers[popover_id];
		if(!popover.fetched){
			popover.fetched = true;
			$.get(popover.url)
				.then(function(response){
					_.extend(popover, response);
				})
				.always(function(){
					Actions.updatePage(page);
				}.bind(this))
		}
	}
});



module.exports = PageStore;