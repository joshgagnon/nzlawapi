"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');
var request = require('../catalex-request');


module.exports = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.print = this.getInitialState().print
        this.counter = 0;
    },
    getInitialState: function(){
        return {print: Immutable.List()};
    },
    update: function(){
        this.trigger({print: this.print});
    },
    onSetState: function(data){
        if(data.get('print')){
            this.print = data.get('print')
        }
        else{
            this.print =  Immutable.fromJS([]);
        }
        this.print.map(function(p){
            this.counter = (p.get('id').match(/\d+/)[0]|0) + 1
        }, this);
        this.update();
    },
    getById: function(id){
        return this.print.find(function(p){ return p.get('id') === id;});
    },
    getIndex: function(id){
        return this.print.findIndex(function(p){ return p.get('id') === id;});
    },
    onAddToPrint: function(data){
        data.id = 'print-'+this.counter++;
        if(data.html){
            data.fetched = true;
        }
        this.print = this.print.push(Immutable.fromJS(data));
        this.update();
        Actions.notify('Added to Print');
    },
    onFetchPrint: function(print_id){
        var print = this.getById(print_id);
        if(print && !print.get('fetching') && !print.get('fetched') ){
            var get;
            if(print.get('query') ){
                get = request.get('/query', print.get('query').toJS())
            }
            else{
                get = request.get(print.get('query_string'))
            }
            this.print = this.print.mergeDeepIn([this.getIndex(print_id)], {fetching: true});
            get.promise()
                    .then(function(response){ Actions.fetchPrint.completed(print_id, response.body); })
                    .catch(function(response){ Actions.fetchPrint.failure(print_id, response.body); })
                    .done()
            this.update();
         }
    },
    onFetchPrintCompleted: function(print_id, data){
        var print = this.getById(print_id)
        if(print){
            this.print = this.print.mergeDeepIn([this.getIndex(print_id)], {html: data.html || data.html_content, fetched: true});
            this.update();
        }
    },
    onFetchPrintFailure: function(print_id, data){
        var print = this.getById(print_id)
        if(print){
            this.print = this.print.mergeDeepIn([this.getIndex(print_id)],  _.extend({error: true, fetched: true, fetching: false}, data));
            this.update();
        }
    },
    onRemoveFromPrint: function(print_id){
        this.print = this.print.remove([this.getIndex(print_id)]);
        this.update();
    }

});