"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');

// only current used for reset and tour
module.exports = Reflux.createStore({
    listenables: Actions,
    onReset: function(state){
        this.trigger({
            article_type: null,
            search_query: null,
            document_id: null,
            jump_to: null,
            focus_to: null,
            find: null
        });
    },
    onSetSearchForm: function(state){
        this.state = state;
        this.trigger(state);
    }

});