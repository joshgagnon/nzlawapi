"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var findText = require('../util/findText.js');


var partial_docs = ['act', 'regulation'];

var ResultStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.results = [];
		this.counter = 0;
	},
	onUpdateResult: function(result_id, content){
		this.trigger({results: this.results});
	},
	onNewResult: function(result){
		var id, do_fetch = false;
		if(!_.find(this.results, {query: result.query})){
			result.id = 'result-'+this.counter++;
			this.results.push(result);
			do_fetch = true;
		}
		else{
			result = _.find(this.results, {query: result.query});
		}
		this.trigger({results: this.results});
		if(do_fetch){
			this.fetchResult(result);
		}
		Actions.activateResult(result);
	},
	onActivateResult: function(result){
		this.results.map(function(r){
			r.active = false;
		})
		result.active = true;
		this.trigger({results: this.results});
	},
	fetchResult: function(result){
		$.get('/query', result.query)
			.then(function(data){
				if(_.contains(this.results, result)){
					result.content = data;
					Actions.updateResult(result);
				}
			}.bind(this),
			function(){
				result.content = {error: 'Could not retrieve result'};
				Actions.updateResult(result);
			})

	},
	onGetMoreResult: function(result, to_add){
		result.fetching = true;
		_.extend(result, to_add);
		Actions.updateResult(result);
		if(result.query.type === 'search'){
			$.get('/query', _.extend({offset: result.content.search_results.hits.length}, result.query))
				.then(function(data){
					result.offset = data.offset;
					result.content.search_results.hits = result.content.search_results.hits.concat(data.search_results.hits);
					result.fetching = false;
					Actions.updateResult(result);
				})
		}
		else if(_.contains(partial_docs, result.query.type)){
			$.get('/query', _.defaults({find: 'more', requested_parts: result.requested_parts}, result.query))
				.then(function(data){
					result.new_parts = data.parts;
					Actions.updateResult(result);
				})

		}

	},
	onClearResults: function(){
		this.results = [];
		this.trigger({results: this.results})
	},
	onRemoveResult: function(result){
		var index = _.findIndex(this.results, result);
		this.results = _.without(this.results, result);
		if(_.isFinite(index) && result.active && this.results.length){
            this.results[Math.max(0, index-1)].active = true;
        }
		this.trigger({results: this.results});
	}
});



module.exports = ResultStore;