"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');

var ArticleStore = Reflux.createStore({
	listenables: Actions,
	init: function(){
		this.state = {
			pixel: 0,
			repr: ''
		}
	},
	onArticlePosition: function(state){
		this.trigger(state);
	}
});



module.exports = ArticleStore;