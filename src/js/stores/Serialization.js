"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var Actions = require('../actions/Actions');
var ResultStore = require('./ResultStore');

var Serialization = Reflux.createStore({

    init: function() {
        this.listenTo(ResultStore, this.update);
        this.listenTo(Actions.saveState, this.save);
        this.listenTo(Actions.loadState, this.load);
        this.data = {};
    },
    update: function(data){
        this.data = data;
    },
    save: function(name) {
        var new_data = {current: this.data.current, results: this.data.results};
        new_data.results = (new_data.results||[]).map(function(r){
            return _.omit(r, 'content', 'search_results', 'offset', 'new_parts', 'requested_parts');
        });
        var all = _.reject(JSON.parse(localStorage['data'] || '[]'), {name: name});
        all.push({name: name, value: new_data, date: (new Date()).toLocaleString()});
        localStorage['data'] = JSON.stringify(all);
        console.log('saved')
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