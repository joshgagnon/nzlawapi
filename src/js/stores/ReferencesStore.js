"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');

module.exports = Reflux.createStore({
	listenables: Actions,
	onRequestReferences: function(article){
		if(!article._references_fetching || article._references_fetched){
			article._references_fetching = true;
			$.get('/references/'+article.content.id)
				.then(function(response){
					article._references_fetching = false;
					article._references_fetched = true;
					article._references_data = response.references;
					Actions.updateResult(article);
				}.bind(this))
		}
	}
});



