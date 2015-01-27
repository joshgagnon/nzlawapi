"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var findText = require('../util/findText.js');


var ResultStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.results = [];
		this.counter = 0;
	},
	onResultRequest: function(state){

	},
	onNewResult: function(result){
		var id;
		if(!_.find(this.results, {query: result.query})){
			result.id = 'result-'+this.counter++;
			this.results.push(result);
		}
		else{
			result = _.find(this.results, {query: result.query});
		}
		this.trigger({results: this.results, newest: result.id});
	},
	onRemoveResult: function(result){
		var index = _.findIndex(this.results, result)
		this.results = _.without(this.results, result);
		this.trigger({results: this.results, removed_index: index});
	}
});



module.exports = ResultStore;