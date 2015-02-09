"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');



module.exports = Reflux.createStore({
	listenables: Actions,
	onActivateResult: function(result){
		this.trigger({active: result.id});
	},

});