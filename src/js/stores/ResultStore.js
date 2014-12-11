"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');




var FormStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.results = [];
	},
	onResultRequest: function(state){
		console.log('store submit', state);
	},
	onNewResult: function(result){
		if(!_.find(this.results, {id: result.id})){
			this.results.push(result)
		}
		this.trigger(this.results);
	}
});	



module.exports = FormStore;