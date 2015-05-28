"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');


module.exports = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.publish = this.getInitialState().publish;
    },
    getInitialState: function(){
        return {
            publish: Immutable.fromJS({
                show: false,
                url: null
        })};
    },
    onShowPublishedUrl: function(url){
        this.publish = this.publish.merge({show: true, url: url});
        this.update()
    },
    onClosePublishedUrl: function(){
        this.publish = this.publish.merge({show: false});
        this.update()
    },
    update: function(){
        this.trigger({'publish': this.publish});
    }
});