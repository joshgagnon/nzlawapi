"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
//var findText = require('../util/findText.js');


var partial_docs = ['act', 'regulation'];


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
		this.trigger({pages: this.pages}, page);
	},
	onNewPage: function(page, viewer_id){
		var id;
		if(!_.find(this.pages, {query: page.query})){
			page.id = 'page-'+this.counter++;
			this.pages.push(page);
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
	onRequestPage: function(page){
		//todo, guards in Action pre emit
		if(!page.fetching && !page.fetched){
			page.fetching = true;
			$.get('/query', page.query)
				.then(function(data){
					page.fetching = false;
					page.fetched = true;
					if(_.contains(this.pages, page)){
						page.content = data;
						if(data.title){
							page.title = data.title;
						}
						Actions.updatePage(page);
					}
				}.bind(this),
				function(response){
					page.title = 'Error';
					page.content = response.responseJSON || {error: 'A problem occurred'};
					Actions.updatePage(page);
				});
			Actions.updatePage(page);
		}
	},
	onGetMorePage: function(page, to_add){
		page.fetching = true;
		if(!page.finished && page.query.search && page.content.search_results.hits.length){
			$.get('/query', _.extend({offset: page.content.search_results.hits.length}, page.query))
				.then(function(data){
					page.offset = data.offset;
					page.content.search_results.hits = page.content.search_results.hits.concat(data.search_results.hits);
					page.fetching = false;
					if(page.content.search_results.hits.length >= page.content.search_results.total){
						page.finished = true;
					}
					Actions.updatePage(page);
				},function(){
					page.finished = true;
					Actions.updatePage(page);
				})
		}
		else if(_.contains(partial_docs, page.query.type)){
			var to_fetch = _.difference(to_add.requested_parts, page.requested_parts);
			page.requested_parts = _.union(page.requested_parts, to_add.requested_parts);
			if(to_fetch.length){
				$.get('/query', _.defaults({find: 'more', requested_parts: to_fetch}, page.query))
					.then(function(data){
						page.content.parts = _.extend({}, page.content.parts, data.parts);
						Actions.updatePage(page);
					},function(){
						page.content = response.responseJSON || {error: 'A problem occurred'};
						Actions.updatePage(page);
					});
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
		/*if(_.isFinite(index) && page.active && this.pages.length){
            this.pages[Math.max(0, index-1)].active = true;
        }*/
		this.trigger({pages: this.pages}, page);
	},
	addPopover: function(page, link){
		var self = this;
		if(_.contains(this.pages, page)){
			page.open_popovers = page.open_popovers || [];
			page.open_popovers.push(link);
			if(link.fetch){
				$.get(link.url)
					.then(function(data){
						_.extend(link, data);
						link.fetch = false;
						self.trigger({pages: self.pages})
					});
			}
		}
	},
	onLinkOpened: function(page, link){
		//$
		this.addPopover(page, link);
		this.trigger({pages: this.pages}, page);
	},
	onDefinitionOpened: function(page, link){
		//$
		this.addPopover(page, link);
		this.trigger({pages: this.pages}, page);
	},
	onPopoverClosed: function(page, link){
		if(_.contains(this.pages, page)){
			page.open_popovers = _.without(page.open_popovers, link);
			this.trigger({pages: this.pages}, page);
		}
	}
});



module.exports = PageStore;