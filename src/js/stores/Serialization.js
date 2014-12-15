"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var ResultStore = require('./ResultStore');

var Serialization = Reflux.createStore({
	init: function(){
		this.listenTo(ResultStore, this.save);
	},
	save: function(data){
		/*data = _.clone(data);
		data.results = data.results.map(function(r){
			r = _.clone(r);
			r.content = null;
			return r;
		});*/
		console.log(data);
		localStorage['data'] = JSON.stringify(data);
	}
});

module.exports = Serialization;