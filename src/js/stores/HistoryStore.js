"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');
var PageStore = require('./PageStore');
var ViewerStore = require('./ViewerStore');
var BrowserStore = require('./BrowserStore');
var PrintStore = require('./PrintStore');
var Immutable = require('immutable');

module.exports = Reflux.createStore({
    init: function() {
        this.listenTo(PageStore, this.set);
        this.listenTo(ViewerStore, this.set);
        this.listenTo(BrowserStore, this.set);
        this.listenTo(PrintStore, this.set);
        this.listenTo(Actions.goBack, this.onGoBack);
        this.listenTo(Actions.goForward, this.onGoForward);
        this.listenTo(Actions.userAction, this.onUserAction);
        this.state = Immutable.Map();
        this.history = [];
        this.index = -1;
    },
    onUserAction: function(){
        if(this.index < this.history.length-1){
            this.history = this.history.slice(this.index);
        }
        this.history.push(this.state);
        this.index++;
    },
    onGoBack: function(){
        if(this.index > 0){
            this.index--;
            Actions.setState(this.history[this.index]);
        }
    },
    onGoForward: function(){
        if(this.index < this.history.length-1){
            this.index++;
            Actions.setState(this.history[this.index]);
        }
    },
    set: function(state){
        this.state = this.state.merge(state);
    }
});


