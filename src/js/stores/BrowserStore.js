"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Immutable = require('Immutable');


module.exports = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.browser = Immutable.fromJS({});
    },
    update: function(){
        this.trigger({browser: this.browser});
    },
    onToggleUnderlines: function(){
        this.browser = this.browser.set('underlines', !this.browser.get('underlines'));
        this.update();
    },
    onToggleSplitMode: function(){
        this.browser = this.browser.set('split_mode', !this.browser.get('split_mode'));
        this.update();
    },
    onTogglePrintMode: function(){
        this.browser = this.browser.set('print_mode', !this.browser.get('print_mode'));
        this.update();
    },
    onSetState: function(state){
        this.browser = state.get('browser');
        this.update();
    },
});