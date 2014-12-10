"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');

var FormStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.state = {
			loading: false,
			type: 'act'
		}
	},
	onTypeChange: function(state){
		console.log('store search change', state);
		this.trigger(state);
	},
	onResultRequest: function(state){
		console.log('store submit', state);
		this.state.loading = true;
		this.trigger(state);
	}
});	



module.exports = FormStore;