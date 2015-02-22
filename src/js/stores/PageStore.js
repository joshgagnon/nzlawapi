"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Immutable = require('immutable');


var PageStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.pages = Immutable.List();
		this.counter = 0;
	},
	update: function(){
		this.trigger({pages: this.pages.toJS()});
	},
	onSetState: function(data){
		this.pages = data.pages || [];
		this.pages= Immutable.fromJS(_.map(data.pages, function(page){
			return this.generatePage(page);
		}, this));
		this.update();
	},
	generatePage: function(page){
		page = page || {}
		page.id = 'page-'+this.counter++;
		page.popovers = page.popovers || {};
		page.references = page.references || {};
		return page;
	},
	onNewPage: function(page_data, viewer_id){
		var page = this.generatePage(page_data);
		this.pages = this.pages.push(Immutable.fromJS(page));
		Actions.requestPage(page.id);
		if(viewer_id !== undefined){
			Actions.showPage(viewer_id, page.id);
		}
		this.update();
	},
	onNewAdvancedPage: function(page_data, viewer_id){
		var page = this.generatePage(page_data);
		this.update();
		Actions.showPage(viewer_id, page.id, {advanced_search: true});
	},
	getById: function(id){
		return this.pages.find(function(p){
			return p.get('id') === id;
		});
	},
	getIndex: function(id){
		return this.pages.indexOf(this.getById(id))
	},
	onRequestPage: function(page_id){
		//todo, guards in Action pre emit
		var page = this.getById(page_id);
		if(!page.get('fetching') && !page.get('fetching')){
			this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  true});
			this.update();
			var get = page.get('query') ? $.get('/query', page.get('query').toJS() ) : $.get(page.get('query_string'));
			get.then(function(data){
					var result = {
						fetching: false,
						fetched: true,
						query: {
							id: data.id
						},
						fragment: data.fragment,
						content: data,
						title: data.title
					};
					if(data.doc_type){
						result.query.doc_type = data.doc_type;
					}
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], result);
					this.update();
				}.bind(this),
				function(response){
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)],
						{
							title: 'Error',
							content: response.responseJSON || {error: 'A problem occurred'}

						});
					this.update();
				}.bind(this));
		}
	},
	onGetMorePage: function(page_id, to_add){
		var page = this.getById(page_id);
		if(!page.get('finished') && page.getIn(['query', 'search']) && page.getIn(['content', 'search_results', 'hits']).size){
			$.get('/query', _.extend({offset: page.getIn(['content', 'search_results', 'hits']).size}, page.get('query').toJS()))
				.then(function(data){
					var page = this.getById(page_id);
					var result = {
						offset: data.offset,
						content: {
							search_results: {
								hits: page.getIn(['content', 'search_results', 'hits']).concat(data.search_results.hits)
							}
						},
						fetching: false
					};
					if(result.content.search_results.hits.size >= result.content.search_results.total){
						result.finished = true;
					}
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], result);
					this.update();
				}.bind(this),
				function(){
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {finished: true});
					page.finished = true;
					this.update();
				}.bind(this))
		}
		/*else if(to_add.requested_parts && to_add.requested_parts.length){
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
		}*/

	},
	onRemovePage: function(page_id){
		this.pages = this.pages.splice(this.getIndex(page_id), 1);
		this.update();
	},
	onPopoverOpened: function(viewer_id, page_id, popover){
		var page = this.getById(page_id);
		if(!page.getIn(['popovers', popover.id])){
			var result = {};
			result[popover.id] = popover;
			this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers'], result);
			this.update();
		}
	},
	onRequestPopoverData: function(page_id, popover_id){
		var page = this.getById(page_id);
		var popover = page.get('popovers').get(popover_id);
		if(popover && !popover.get('fetched')){
			this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id], {fetched: true});
			$.get(popover.get('url'))
				.then(function(response){
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id], response);
				}.bind(this),
					function(){

					})
				.always(function(){
					this.update();
				}.bind(this))
		}
	},
	onRequestReferences: function(page_id){
		var page = this.getById(page_id);

		if(!page.get('references').get('fetched')){
			this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'references'], {fetched: true});
			$.get('/references/'+page.get('content').get('document_id'))
				.then(function(response){
					this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'references'], {references_data: response.references});
					this.update();
				}.bind(this))
			this.update();
		}
	}
});



module.exports = PageStore;