/* jslint node: true */
'use strict';

var Reflux = require('reflux');
var strings = require('../strings');
var Actions = require('../actions/Actions');

module.exports =  Reflux.createStore({
    listenables: Actions,
    init: function() {
        this.errors = this.getInitialState();
    },
    getInitialState: function() {
        return { errorTitle: null, errorText: null };
    },
    update: function() {
        this.trigger(this.errors);
    },
    onSetError: function(name) {
        this.errors.errorTitle = strings.errors[name].title;
        this.errors.errorText = strings.errors[name].text;
        this.update();
    },
    onClearError: function() {
        this.errors.errorTitle = null;
        this.errors.errorText = null;
        this.update();
    }
});
