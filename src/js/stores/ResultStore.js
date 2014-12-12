"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');



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
		this.trigger(this.results);
	},
	onRemoveResult: function(result){
		this.results = _.without(this.results, result)
		this.trigger(this.results);
	}
});	



module.exports = FormStore;