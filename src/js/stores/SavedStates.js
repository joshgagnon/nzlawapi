"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');
var PageStore = require('./PageStore');
var ViewerStore = require('./ViewerStore');
var BrowserStore = require('./BrowserStore');
var Immutable = require('Immutable');

module.exports = Reflux.createStore({

    init: function() {
        this.listenTo(PageStore, this.updatePages);
        this.listenTo(ViewerStore, this.updateViews);
        this.listenTo(BrowserStore, this.updateBrowser);
        this.listenTo(Actions.saveState, this.save);
        this.listenTo(Actions.loadState, this.load);
        this.listenTo(Actions.fetchSavedStates, this.onFetchSavedStates);
        this.listenTo(Actions.removeSavedState, this.onRemoveSavedState);
        this.listenTo(Actions.createSaveFolder, this.onCreateSaveFolder);
        this.listenTo(Actions.removeSaveFolder, this.onRemoveSaveFolder);
        this.listenTo(Actions.renameSavedState, this.onRenameSavedState);
        this.listenTo(Actions.loadPrevious, this.onLoadPrevious);
        this.pages = [];
        this.views = {};
        this.browser = {};
        this.saveCurrent = _.debounce(this.saveCurrent, 1000);
        if(localStorage['API_VERSION'] !== window.API_VERSION){
            delete localStorage['current_view'];
            delete localStorage['saved_views'];
            localStorage['API_VERSION'] = window.API_VERSION
        }
    },
    updatePages: function(pages){
        this.pages = pages.pages.toJS();
        this.saveCurrent();
    },
    updateViews: function(views){
        this.views = views.views.toJS();
        this.saveCurrent();
    },
    updateBrowser: function(browser){
        this.browser = browser;
        this.saveCurrent();
    },
    prepState: function(){
        function pickPage(page){
            var obj = _.pick(page, 'title', 'query');
            obj.popovers = {}
           _.each(page.popovers || [] ,function(v, k){
                return obj.popovers[k] = _.pick(v, 'type', 'title', 'url', 'source_sel', 'id');
            });
            return obj;
        }
        return {views: this.views, pages: (this.pages||[]).map(pickPage), browser: this.browser};
    },
    saveCurrent: function() {
        localStorage['current_view'] = JSON.stringify(this.prepState());
    },
    onLoadPrevious: function() {
        if(localStorage['current_view']){
            Actions.setState(Immutable.fromJS(JSON.parse(localStorage['current_view'])));
        }
    },
    save: function(path) {
        var states = this.readStates();
        var current = this.getFolder(states, path.slice(0, path.length-1));
        current.children = _.reject(current.children, {type: 'state', name: _.last(path)});
        current.children.push({name: _.last(path), type: 'state', value: this.prepState(), date: (new Date()).toLocaleString()});
        this.setStates(states);
    },
    readStates: function(){
        var data = {};
       if(localStorage['saved_views']){
            try{
                data = JSON.parse(localStorage['saved_views']) || {};
            }catch(e){
                data =  {};
            }
        }
        return _.defaults(data, this.createFolder('root'));
    },
    setStates: function(states){
        localStorage['saved_views'] = JSON.stringify(states);
        this.update();
    },
    load: function(path) {
        var states = this.readStates();
        var current = states;
        _.map(path, function(p){
            current = _.find(current.children, {name: p});
        });
        var selected = current.value;
        if(selected){
            Actions.setState(Immutable.fromJS(selected));
        }
    },
    getFolder: function(states, path){
        var current = states;
        _.each(path, function(p){
            var folder = _.find(current.children, {name: p});
            if(!folder){
                folder = this.createFolder(p);
                current.children.push(folder);
            }
            current = folder;
        }, this);
        return current;
    },
    onRemoveSavedState: function(path){
        var states = this.readStates();
        var current = this.getFolder(states, path.slice(0, path.length-1));
        current.children = _.reject(current.children, {type: 'state', name: _.last(path)});
        this.setStates(states);
    },
    onFetchSavedStates: function(){
        //will be ajax
        this.update();
    },
    onCreateSaveFolder: function(path){
        var states = this.readStates();
        var current = states;
        _.each(path, function(p){
            var folder = _.find(current.children, {name: p, type: 'folder'});
            if(!folder){
                folder = this.createFolder(p);
                current.children.push(folder);
            }
            current = folder;
        }, this);
        this.setStates(states);
    },
    onRemoveSaveFolder: function(path){
        var states = this.readStates();
        var current = states;
        _.each(path.slice(0, path.length-1), function(p){
            var folder = _.find(current.children, {name: p, type: 'folder'});
            current = folder;
        }, this);
        var name = _.last(path);
        current.children = _.reject(current.children, {name: name, type: 'folder'});
        this.setStates(states);

    },
    onRenameSavedState: function(path, new_name){
        var states = this.readStates()
        this.getFolder(states, path).name = new_name;
        this.setStates(states);

    },
    createFolder: function(name){
        return {name: name, type: 'folder', children: []}
    },
    update: function(){
        this.trigger({saved_views: this.readStates()});

    }
});

