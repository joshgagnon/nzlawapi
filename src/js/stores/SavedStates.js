"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');
var PageStore = require('./PageStore');
var ViewerStore = require('./ViewerStore');

var Serialization = Reflux.createStore({

    init: function() {
        this.listenTo(PageStore, this.updatePages);
        this.listenTo(ViewerStore, this.updateViews);
        this.listenTo(Actions.saveState, this.save);
        this.listenTo(Actions.loadState, this.load);
        this.listenTo(Actions.fetchSavedStates, this.onFetchSavedStates);
        this.listenTo(Actions.removeSavedState, this.onRemoveSavedState);
        this.listenTo(Actions.loadPrevious, this.onLoadPrevious);
        this.pages = [];
        this.views = {};
    },
    updatePages: function(pages){
        this.pages = pages.pages;
        this.saveCurrent();
    },
    updateViews: function(views){
        this.views = views.views;
        this.saveCurrent();
    },
    prepState: function(){
        return {views: this.views, pages: (this.pages||[]).map(function(r){
            return _.pick(r, 'title', 'query');
        })};
    },
    saveCurrent: function() {
        localStorage['current_view'] = JSON.stringify(this.prepState());
    },
    onLoadPrevious: function() {
        if(localStorage['current_view']){
            Actions.setState(JSON.parse(localStorage['current_view']));
        }
    },
    save: function(name) {
        var all = _.reject(JSON.parse(localStorage['saved_views'] || '[]'), {name: name});
        all.push({name: name, value: new_data, date: (new Date()).toLocaleString()});
        localStorage['saved_views'] = JSON.stringify(all);
    },
    readState: function(){
       if(localStorage['saved_views']){
            return JSON.parse(localStorage['saved_views']) || {};
        }
        return {};
    },
    load: function(name) {
        var selected = _.find(this.readState(), {name: name});
        if(selected){
            Actions.setState(selected);
        }
    },
    onRemoveSavedState: function(value){
        if(localStorage['saved_views']){
            localStorage['saved_views'] = JSON.stringify(_.reject(JSON.parse(localStorage['saved_views'] || '[]'), {name: value}));
            this.update();
        }
    },
    onFetchSavedStates: function(){
        //will be ajax
        this.update();
    },
    update: function(){
        this.trigger({saved_views: JSON.parse(localStorage['saved_views'] || '[]')})

    }
});

module.exports = Serialization;