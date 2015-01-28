"use strict";

var Reflux = require('reflux');
var _ = require('lodash');
var ResultStore = require('./ResultStore');

var Serialization = Reflux.createStore({

    init: function() {
        this.listenTo(ResultStore, this.save);
    },
    save: function(data) {
        var new_data = {current: data.current, results: data.results};
        new_data.results = new_data.results.map(function(r){
            return _.omit(r, 'content', 'search_results', 'offset');
        });
        localStorage['data'] = JSON.stringify(new_data);
    }
});

module.exports = Serialization;