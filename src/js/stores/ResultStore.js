"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var findText = require('../util/findText.js');

function insertDefinitions(result){
	var content = $(result.content.html_content);
	var reg = new RegExp('('+_.keys(result.definitions).join('|')+')', 'ig');
	findText(content.get(0), reg, function(highlighted){
        var span = document.createElement('span');
          span.className = 'mark';
          span.appendChild(highlighted);
          return span;
     });
	result.content.html_content = content.prop('outerHTML') 

}



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
	},
	onDefinitions: function(id, definitions){
		var result = _.find(this.results, {id: id});
		result.definitions = definitions;
		insertDefinitions(result);
		this.trigger({results: this.results});
	}
});	



module.exports = ResultStore;