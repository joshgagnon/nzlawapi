"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var findText = require('../util/findText.js');

function insertDefinitions(result){
	var content = $(result.content.html_content);
	var reg = new RegExp('('+_.keys(result.definitions).join('|')+')[s]?', 'ig');
	console.log(reg)
	findText(content.get(0), reg, function(highlighted){
		var key = highlighted.textContent.toLowerCase();
		//ugly ugly, need to be smarter about this later
		if(!result.definitions[key]){
			key = key.substring(0, key.length - 1);
		}
		var def = result.definitions[key];
		var span = document.createElement('span');
		span.appendChild(highlighted);
		span.setAttribute('data-toggle', 'popover');
		span.setAttribute('title', def.key);
		span.setAttribute('data-html', true);
		span.className = 'defined-word';
		span.setAttribute('data-content', def.html_content);
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
		result.definitions_processed=true;
		this.trigger({results: this.results});
	}
});	



module.exports = ResultStore;