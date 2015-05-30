"use strict";
var React = require('react/addons');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');

// only current used for reset
var TourStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.tour = this.getInitialState().tour
    },
    getInitialState: function(){
        return {
            tour: Immutable.fromJS({
                running: false,
                position: 0
        })};
    },
    onTourStart: function(state){
        this.tour =

    }
});



module.exports = {



}