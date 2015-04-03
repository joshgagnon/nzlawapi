"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');
var PageStore = require('./PageStore');
var ViewerStore = require('./ViewerStore');
var BrowserStore = require('./BrowserStore');
var PrintStore = require('./PrintStore');
var HistoryStore = require('./HistoryStore');
var Immutable = require('immutable');
var request = require('superagent-bluebird-promise');




module.exports = Reflux.createStore({

    init: function() {
        this.listenTo(PageStore, this.updatePages);
        this.listenTo(ViewerStore, this.updateViews);
        this.listenTo(BrowserStore, this.updateBrowser);
        this.listenTo(PrintStore, this.updatePrint);
        this.listenTo(Actions.saveState, this.save);
        this.listenTo(Actions.loadState, this.load);
        this.listenTo(Actions.fetchSavedStates, this.onFetchSavedStates);
        this.listenTo(Actions.removeSavedState, this.onRemoveSavedState);
        this.listenTo(Actions.createSaveFolder, this.onCreateSaveFolder);
        this.listenTo(Actions.removeSaveFolder, this.onRemoveSaveFolder);
        this.listenTo(Actions.renameSavedState, this.onRenameSavedState);
        this.listenTo(Actions.loadPrevious, this.onLoadPrevious);
        this.listenTo(Actions.userAction, this.saveCurrent);
        this.listenTo(Actions.reset, this.onReset);

        this.pages = Immutable.List();
        this.print = Immutable.List();
        this.views = Immutable.Map();
        this.browser = Immutable.Map();
    },
    updatePages: function(pages){
        this.pages = pages.pages;
    },
    updateViews: function(views){
        this.views = views.views;
    },
    updateBrowser: function(browser){
        this.browser = browser.browser;
    },
    updatePrint: function(print){
        this.print = print.print;
    },
    prepState: function(){
        function pickPage(page){
            return !page.content || (page.content && !page.content.error);
        }
        function prepPage(page){
            var obj = _.pick(page, 'title', 'query', 'id', 'page_type', 'query_string');
            obj.popovers = {}
           _.each(page.popovers || [] ,function(v, k){
                return obj.popovers[k] = _.pick(v, 'type', 'title', 'query', 'query_string', 'source_sel', 'id');
            });
            return obj;
        }
        function prepPrint(print){
            return _.pick(print, 'query_string', 'query', 'id', 'title', 'full_title');
        }
        var views = this.views.toJS();
        _.forOwn(views, function(v, k){
            delete views[k]['section_summaries'];
        }, this)
        return {views: views,
            pages: _.map(_.filter(this.pages.toJS(), pickPage), prepPage),
            browser: this.browser.toJS(),
            print: _.map(this.print.toJS(), prepPrint)};
    },
    saveCurrent: function(){
        if(localStorage){
            localStorage['current_view'] = JSON.stringify(this.prepState());
        }
    },
    onLoadPrevious: function(filter){
        if(localStorage && localStorage['current_view']){
            var data;
            try{
                data = JSON.parse(localStorage['current_view']) || {};
            }catch(e){
                data =  {};
            }
            if(filter){
                data = _.pick.apply(_, [data].concat(filter));
            }
            Actions.setState(Immutable.fromJS(data));
            Actions.loadedFromStorage();
        }
    },
    save: function(path) {
        var states = this.saved_states;
        var current = this.getFolder(states, path.slice(0, path.length-1));
        current.children = _.reject(current.children, {type: 'state', name: _.last(path)});
        current.children.push({name: _.last(path), type: 'state', value: this.prepState(), date: (new Date()).toLocaleString()});
        this.setStates(states);
    },
    setStates: function(states){
        request.post('/saved_states', {saved_states: states})
            .promise()
            .then(function(){
                this.update();
                Actions.notify('Session Saved');
            }.bind(this))
            .catch(function(){
                this.update() ;
                Actions.notify('There was a problem saving', true);
            }.bind(this));
        this.saved_states = states;
        this.update();
    },
    load: function(path) {
        var states = this.saved_states;
        var current = states;
        _.map(path, function(p){
            current = _.find(current.children, {name: p});
        });
        var selected = current.value;
        if(selected){
            Actions.setState(Immutable.fromJS(selected));
            Actions.loadedFromStorage();
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
        var states = this.saved_states;
        var current = this.getFolder(states, path.slice(0, path.length-1));
        current.children = _.reject(current.children, {type: 'state', name: _.last(path)});
        this.setStates(states);
    },
    onFetchSavedStates: function(){
        return request
            .get('/saved_states')
            .promise()
            .then(function(response){
                this.saved_states = _.defaults(response.body.saved_states || {}, this.createFolder('root'));
                this.update();
            }.bind(this))
            .catch(function(){
                this.saved_states = this.createFolder('root');
                this.update();
            }.bind(this))
    },
    onCreateSaveFolder: function(path){
        var states = this.saved_states;
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
        var states = this.saved_states;
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
        var states = this.saved_states;
        this.getFolder(states, path).name = new_name;
        this.setStates(states);

    },
    createFolder: function(name){
        return {name: name, type: 'folder', children: []}
    },
    update: function(){
        this.trigger({saved_views: this.saved_states});

    },
    onReset: function(){
        Actions.setState(Immutable.fromJS({views:{}, pages:[]}));
    }
});


var UserActions = Reflux.createStore({
    actions: [
        Actions.newPage,
        Actions.newAdvancedPage,
        Actions.showPage,
        Actions.removePage,
        Actions.addToPrint,
        Actions.removeFromPrint,
        Actions.printMovePosition,
        Actions.toggleUnderlines,
        Actions.toggleSplitMode,
        Actions.toggleSidebar,
        Actions.togglePrintMode,
        Actions.loadedFromStorage,
        Actions.popoverOpened,
        Actions.popoverClosed,
        Actions.popoverMove,
        Actions.replacePage,
        Actions.reset
    ],
    init: function() {
        this.actions.map(function(a){
            this.listenTo(a, this.userAction)
        }, this)
    },
    userAction: function(){
        Actions.userAction();
    }
});

