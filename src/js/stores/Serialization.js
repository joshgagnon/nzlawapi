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
        this.pages = {};
        this.views = []
    },
    updatePages: function(pages){
        this.pages = pages;
    },
    updateViews: function(views){
        this.views = views;
    },
    save: function(name) {
        var new_data = {current: this.data.current, results: this.data.results};
        new_data.results = (new_data.results||[]).map(function(r){
            return _.omit(r, 'content', 'search_results', 'offset', 'new_parts', 'requested_parts', 'fetched', 'fetching');
        });
        var all = _.reject(JSON.parse(localStorage['data'] || '[]'), {name: name});
        all.push({name: name, value: new_data, date: (new Date()).toLocaleString()});
        localStorage['data'] = JSON.stringify(all);
    },
    load: function(name) {

        if(localStorage['data']){
            var data = JSON.parse(localStorage['data']);

            var selected = _.find(data, {name: name});
            if(selected){
                Actions.clearResults();
                _.forEach(selected.value.results, function(r){
                    Actions.newResult(r);
                });
            }
        }
    }
});

module.exports = Serialization;