"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Immutable = require('immutable');


var PageStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.pages = Immutable.List();
        this.counter = 0;
    },
    getInitialState: function(){
        return {pages: this.pages};
    },
    update: function(){
        this.trigger({pages: this.pages});
    },
    onSetState: function(data){
        if(data.get('pages')){
            this.pages = data.get('pages').map(function(page){
                return Immutable.fromJS(this.generatePage(page.toJS()));
            }, this);
        }
        else{
            this.pages =  Immutable.fromJS([]);
        }
        this.pages.map(function(p){
            this.counter = (p.get('id').match(/\d+/)[0]|0) + 1;
        }, this);
        this.update();
    },
    generatePage: function(page){
        page = page || {}
        page.id = page.id || ('page-'+this.counter++);
        page.popovers = page.popovers || {};
        delete page['fetching'];

        _.map(page.popovers, function(v, k){
            page.popovers[k] =  _.omit(v, 'fetching');
        });

        page.section_data = page.section_data || {};
        _.map(page.section_data, function(v, k){
            page.section_data[k] =  _.omit(v, 'fetching');
        });

        page.parts = page.parts || {};
        _.map(page.parts, function(v, k){
            page.parts[k] =  _.omit(v, 'fetching');
        });

        page.references = _.omit(page.references || {}, 'fetching');
        page.versions = _.omit(page.versions || {}, 'fetching');

        return page;
    },
    onNewPage: function(page_data, viewer_id){
        var page = this.generatePage(page_data);
        this.pages = this.pages.push(Immutable.fromJS(page));
        Actions.requestPage(page.id);
        if(viewer_id !== undefined){
            Actions.showNewPage(viewer_id, page.id);
        }
        this.update();
    },
    onNewAdvancedPage: function(page_data, viewer_id){
        var page = this.generatePage(page_data);
        this.pages = this.pages.push(Immutable.fromJS(page));
        this.update();
        Actions.showNewPage(viewer_id, page.id, {advanced_search: true});
    },
    getById: function(id){
        return this.pages.find(function(p){
            return p.get('id') === id;
        });
    },
    getIndex: function(id){
        return this.pages.indexOf(this.getById(id))
    },
    replacePage: function(page_id, page){
         this.pages = this.pages.mergeDeepIn(
            [this.getIndex(page_id)],
            _.extend({content: {}, fetching: false, fetched: false}, page));
         this.update();
    },
    onRequestPage: function(page_id){
        //todo, guards in Action pre emit
        var page = this.getById(page_id);
        if(!page.get('fetching') && !page.get('fetched')){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  true});
            this.update();
            var get;
            get = page.get('query_string') ?
                $.get(page.get('query_string')) :
                $.get('/query', page.get('query').toJS());
            get.then(function(data){
                    var result = {
                        fetching: false,
                        fetched: true,
                        fragment: data.fragment,
                        content: data,
                        title: data.title
                    };
                    if(data.query){
                        result.query = data.query;
                        result.query_string = null;
                        if(data.query.location){
                            result.title += ' '+ data.query.location;
                        }
                    }
                    if(data.parts){
                        result.parts = data.parts;
                    }
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], result);
                    this.update();
                }.bind(this),
                function(response){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)],
                        {
                            title: 'Error',
                            content: response.responseJSON || {error: 'A problem occurred'}

                        });
                    this.update();
                }.bind(this));
        }
    },
    onGetMorePage: function(page_id, to_add){
        var page = this.getById(page_id);
        if(page.get('page_type') === 'search'){
            if(!page.get('finished') &&
                !page.get('fetching') &&
                page.get('content') && page.getIn(['content', 'search_results', 'hits']).size){
                this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  true});
                $.get('/query', _.extend({
                    offset: page.getIn(['content', 'search_results', 'hits']).size},
                    page.get('query').toJS()))
                    .then(function(data){
                        var page = this.getById(page_id);
                        var result = {
                            offset: data.offset,
                            content: {
                                search_results: {
                                    hits: page.getIn(['content', 'search_results', 'hits'])
                                        .toJS().concat(data.search_results.hits)
                                }
                            },
                            fetching: false
                        };
                        if(result.content.search_results.hits.size >= result.content.search_results.total){
                            result.finished = true;
                        }
                        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], Immutable.fromJS(result));
                        this.update();
                    }.bind(this),
                    function(){
                        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {finished: true});
                        this.update();
                    }.bind(this));
            }
        }
        else if(to_add.requested_parts && to_add.requested_parts.length){
            var parts = page.get('parts').toJS();
            var to_fetch = _.filter(to_add.requested_parts, function(p){ return !parts[p] });
            if(to_fetch.length){
                _.map(to_fetch, function(p){
                    parts[p] = {fetching: true};
                });
                this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'parts'], parts);
                this.update();
                $.get('/query', _.defaults({find: 'more', parts: to_fetch}, page.get('query').toJS() ))
                    .then(function(data){
                        page = this.getById(page.id);
                        var results = {}
                        _.map(data.parts, function(v, k){
                            results[k] = {fetching: false, fetched: true, html: v};
                        });
                        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'parts'], results);
                        this.update();
                    }.bind(this),function(response){
                        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)],
                            {
                                title: 'Error',
                                content: response.responseJSON || {error: 'A problem occurred'}

                            });
                        this.update();
                    }.bind(this));
            }
        }
    },
    onRemovePage: function(page_id){
        this.pages = this.pages.splice(this.getIndex(page_id), 1);
        this.update();
    },
    onPopoverOpened: function(viewer_id, page_id, popover){
        var page = this.getById(page_id);
        if(!page.getIn(['popovers', popover.id ])){
            var result = {};
            result[popover.id] = popover;
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers'], result);
            this.update();
        }
    },
    onSectionSummaryOpened: function(viewer_id, page_id, section_data){
        var page = this.getById(page_id);
        if(!page.getIn(['section_data', section_data.id ])){
            var result = {};
            result[section_data.id] = section_data;
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data'], result);
            this.update();
        }
    },

    //TODO position, should be in view
    onPopoverUpdate: function(viewer_id, page_id, popover){
        var page = this.getById(page_id);
        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover.id], popover);
        this.update();
    },
    onRequestPopoverData: function(page_id, popover_id){
        var page = this.getById(page_id);
        var popover = page.get('popovers').get(popover_id);
        if(popover && !popover.get('fetching') && !popover.get('fetched')){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                {fetching: true});
            $.get(popover.get('url'))
                .then(function(response){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                        {fetched: true, fetching: false});
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                        response);
                }.bind(this),
                    function(){
                        //TODO, error
                    })
                .always(function(){
                    this.update();
                }.bind(this))
        }
    },
    onRequestReferences: function(page_id){
        var page = this.getById(page_id);
        if(page && !page.getIn(['references', 'fetching']) && !page.getIn(['references', 'fetched'])){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'references'], {fetching: true});
            $.get('/references/'+page.get('content').get('document_id'))
                .then(function(response){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'references'],
                        {references_data: response.references, fetched: true, fetching: false});
                    this.update();
                }.bind(this))
            this.update();
        }
    },

    onRequestSectionReferences: function(page_id, section_id){
        var page = this.getById(page_id);
        if(!page.getIn(['section_data', section_id, 'fetching']) &&
            !page.getIn(['section_data', section_id, 'fetched'])){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                {fetching: true});
            $.get('/section_references', {govt_ids: page.getIn(['section_data', section_id, 'govt_ids']).toJS()})
                .then(function(response){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                        {fetched: true, fetching: false});
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                        response);
                    this.update();
                }.bind(this))
            this.update();
        }
    },
    onRequestVersions: function(page_id){
        var page = this.getById(page_id);
        if(!page.getIn(['versions', 'fetching']) && !page.getIn(['versions', 'fetched'])){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'versions'], {fetching: true});
            $.get('/versions/'+page.get('content').get('document_id'))
                .then(function(response){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'versions'],
                        {versions_data: response.versions, fetched: true, fetching: false});
                    this.update();
                }.bind(this))
            this.update();
        }
    },
});



module.exports = PageStore;