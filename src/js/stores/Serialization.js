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
    },
    update: function(data){
        this.data = data;
    },
    save: function() {
        var new_data = {current: this.data.current, results: this.data.results};
        new_data.results = new_data.results.map(function(r){
            return _.omit(r, 'content', 'search_results', 'offset', 'new_parts', 'requested_parts');
        });
        localStorage['data'] = JSON.stringify(new_data);
        console.log('saved')
    },
    load: function() {
        Actions.clearResults();
        if(localStorage['data']){
            _.forEach(JSON.parse(localStorage['data']).results, function(r){
                Actions.newResult(r);
            });
        }
    }
});

module.exports = Serialization;