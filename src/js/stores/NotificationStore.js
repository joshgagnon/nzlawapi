"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');

module.exports = Reflux.createStore({
	listenables: Actions,
	time_to_live: 3000,
	init: function(){
		this.id = 0;
		this.notifications = Immutable.List();
	},
	onNotify: function(message, error){
		var id = this.id++
		this.notifications = this.notifications.push({id: id, message: message, error: error});
		this.update();
		setTimeout(function(){
			this.onCloseNotification(id);
		}.bind(this), this.time_to_live)
	},
	onCloseNotification: function(id){
		this.notifications = this.notifications.filter(function(n){
			return n.id !== id;
		});
		this.update();
	},
	update: function(){
		this.trigger({'notifications': this.notifications});
	}
});
