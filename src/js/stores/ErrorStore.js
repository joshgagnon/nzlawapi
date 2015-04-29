/* jslint node: true */
'use strict';

var Reflux = require('reflux');
var Actions = require('../actions/Actions');

module.exports =  Reflux.createStore({
    listenables: Actions,
    init: function() {
        this.errors = this.getInitialState();
    },
    getInitialState: function() {
        return { unavailable: false };
    },
    update: function() {
        this.trigger(this.errors);
    },
    onSetUnavailable: function(status) {
        this.errors.unavailable = status;
        this.update();
    },
});
