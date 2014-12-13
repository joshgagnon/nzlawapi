"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');



var ResultStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.results = [];
		this.counter = 0;
	},
	onResultRequest: function(state){
		console.log('store submit', state);
	},
	onNewResult: function(result){
		var id;
		if(!_.find(this.results, {query: result.query})){
			result.id = 'result-'+this.counter++;
			if(result.content.html_content){
				var $content = $(result.content.html_content.replace(/<br\/>/, ' ' ));
				var title = $content.find('h1.title').text();
				if($content.find('h2.part')){
					title += ' ' + $content.find('h2.part').text();
				}
				result.title = title;
			}
			this.results.push(result)
		}
		else{
			result = _.find(this.results, {query: result.query});
		}
		_.map(this.results, function(r){
			r.current = false;
		});
		result.current = true;
		this.trigger({results: this.results, current: result.id});
	},
	onRemoveResult: function(result){		
		this.results = _.without(this.results, result)
		this.trigger({results: this.results});
	}
});	



module.exports = ResultStore;