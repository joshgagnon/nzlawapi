"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');



module.exports = Reflux.createStore({
    listenables: Actions,
    update: function(){
        this.trigger({underlines: this.underlines, split_mode: this.split_mode, print_mode: this.print_mode});
    },
    onToggleUnderlines: function(){
        this.underlines = !this.underlines;
        this.update();
    },
    onToggleSplitMode: function(){
        this.split_mode = !this.split_mode;
        this.update();
    },
    onTogglePrintMode: function(){
        this.print_mode = ! this.print_mode;
        this.update();
    },
    onSetState: function(state){
        _.extend(this, state.browser);
        this.update();
    },
});