"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');




var SavedStates = Reflux.createStore({
    init: function() {
        this.listenTo(Actions.fetchSavedStates, this.onFetchSavedStates);
        this.listenTo(Actions.removeSavedState, this.onRemoveSavedState);
    },
    onRemoveSavedState: function(value){
        if(localStorage['data']){
            localStorage['data'] = JSON.stringify(_.reject(JSON.parse(localStorage['data'] || '[]'), {name: value}));
            this.update();
        }
    },
    onFetchSavedStates: function(){
        this.update();
        //Actions.updateSavedStates(localStorage['savedViews']);
    },
    update: function(){
        this.trigger({saved_views: JSON.parse(localStorage['data'] || '[]')})

    }
});

module.exports = SavedStates;