"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Immutable = require('immutable');


module.exports = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.browser = this.getInitialState().browser;
    },
    getInitialState: function(){
        return {browser: Immutable.fromJS({})};
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
        if(this.browser.get('split_mode')){
            this.browser = this.browser.set('print_mode', false);
        }
        this.update();
    },
    onActivatePrintMode: function(){
        if(!this.browser.get('print_mode')){
            this.onTogglePrintMode();
        }
    },
    onTogglePrintMode: function(){
        this.browser = this.browser.set('print_mode', !this.browser.get('print_mode'));
        if(this.browser.get('print_mode')){
            this.browser = this.browser.set('split_mode', false);
        }
        this.update();
    },
    onSetState: function(state){
        if(state.get('browser')){
            this.browser = state.get('browser');
        }
        else{
            this.browser = this.getInitialState().browser;
        }

        this.update();
    },
});