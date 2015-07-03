"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');
var request = require('../catalex-request');
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var RESOURCE_TYPES = require('../constants').RESOURCE_TYPES;


var PageStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.pages = this.getDefaultData();
        this.counter = 0;
    },
    getDefaultData: function(){
        return Immutable.List()
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
            this.pages.map(function(p){
                this.counter = (p.get('id').match(/\d+/)[0]|0) + 1;
            }, this);
            this.update();
        }
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
        page.contents = _.omit(page.contents || {}, 'fetching');
        return page;
    },
    findDuplicate: function(page_data){
        // we will fine a duplicate as having the same set of query fields
         //var fields = ['document_id', 'find', 'location', 'govt_location', 'govt', 'query', 'contains', 'contains_type', ];
        // consider page_type,
        // beware of necessary tranformsation
        // consider just hashing that object above
        // or, could add NaN or some other hack to mark 'dirty' pages, maybe after user interaction

        return this.pages.find(function(p){
            if(page_data.query_string && page_data.query_string===p.get('query_string')){
                return true;
            }
            if(!page_data.query || !p.get('query')){
                return false;
            }
            return _.isEqual(_.omit(p.get('query').toJS(), 'offset'), page_data.query)
        });
    },
    onNewPage: function(page_data, viewer_id, settings){
        var existing_page = this.findDuplicate(page_data);
        if(existing_page){
            if(viewer_id !== undefined){
                console.log('dupe');
                // may have new position
                Actions.showPage(viewer_id, existing_page.get('id'), settings);
            }
            else{
            }
        }
        else{
            var page = this.generatePage(page_data);
            this.pages = this.pages.push(Immutable.fromJS(page));
            Actions.requestPage(page.id);
            if(viewer_id !== undefined){
                Actions.showNewPage(viewer_id, page.id, settings);
            }
            this.update();
        }
    },
    getById: function(id){
        return this.pages.find(function(p){
            return p.get('id') === id;
        });
    },
    getIndex: function(id){
        return this.pages.indexOf(this.getById(id))
    },
    onReplacePage: function(page_id, page, options){
        this.pages = this.pages.setIn(
            [this.getIndex(page_id)],
            Immutable.fromJS(_.extend({}, this.getById(page_id).toJS(),
                {content: {}, fetching: false, fetched: false, finished: false, error: null}, page)));
        Actions.requestPage(page_id, options);

    },
    onRequestPage: function(page_id, options){
        options = options || {};
        var page = this.getById(page_id);

        if(!page || (!page.get('query') && !page.get('query_string'))) return;

        if(!page.get('fetching') && !page.get('fetched') && !page.get('error')){
            var get;
            get = page.get('query') ?
                request.get('/query', page.get('query').toJS()) :
                request.get(page.get('query_string'));
            get
                .promise()
                .then(function(response){ Actions.requestPage.completed(page_id, response.body); })
                .catch(function(response){ Actions.requestPage.failure(page_id, response.body); })
                .done()
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  true});
            if(!options.skip_update){
                this.update();
            }

        }
    },
    onRequestPageCompleted: function(page_id, data){
        var page = this.getById(page_id);
        if(page){
            var result = {
                fetching: false,
                fetched: true,
                fragment: data.fragment,
                content: data
            };
            if(data.title){
                result.title = data.title;
            }
            if(page.get('page_type') === PAGE_TYPES.SEARCH){
                if(result.content.search_results.hits.length >= result.content.search_results.total){
                    result.finished = true;
                }
            }
            if(data.query){
                result.query = data.query;
                result.query_string = null;
                if(data.query.location){
                    result.title += ' '+ data.query.location;
                }
            }
            if(data.doc_type){ //danger?
                result.page_type = data.doc_type;
            }
            if(data.search_type){
                result.search_type = data.search_type;
            }
            if(data.parts){
                result.parts = {};
                _.map(data.parts, function(p, i){  result.parts[i] = {fetching: false, fetched: true, html: p}});
            }
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], result);
            this.update();
        }
    },
    onRequestPageFailure: function(page_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)],
                {
                title: 'Error',
                content: data || {error: 'A problem occurred'},
                error: true
            });
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  false});
            this.update();
        }
    },
    onGetMorePage: function(page_id, to_add){
        var page = this.getById(page_id), get;
        if(page){
            if(page.get('page_type') === PAGE_TYPES.SEARCH){
                if(!page.get('finished') &&
                    !page.get('fetching') &&
                    page.get('content') && page.getIn(['content', 'search_results', 'hits']) &&
                    page.getIn(['content', 'search_results', 'hits']).size){
                    this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], {'fetching':  true});
                    get = request.get('/query', _.extend({
                        offset: page.getIn(['content', 'search_results', 'hits']).size},
                        page.get('query').toJS()));
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
                    get = request.get('/query')
                    get.query(_.defaults({find: 'more', parts: to_fetch}, page.get('query').toJS() ));
                }
            }
            if(get){
                get
                    .promise()
                    .then(function(response){ Actions.getMorePage.completed(page_id, response.body) })
                    .catch(function(response){ Actions.getMorePage.failure(page_id, response.body) });
                this.update();
            }
        }
    },
    onGetMorePageCompleted: function(page_id, data){
        var page = this.getById(page_id), result = {};
        if(page){
            if(page.get('page_type') === PAGE_TYPES.SEARCH){
                    result = {
                    offset: data.offset,
                    content: {
                        search_results: {
                            hits: page.getIn(['content', 'search_results', 'hits'])
                                .toJS().concat(data.search_results.hits)
                        }
                    },
                    fetching: false
                };
                if(result.content.search_results.hits.length >= data.search_results.total){
                    result.finished = true;
                }
            }
            else{
                result.parts = {}
                _.map(data.parts, function(v, k){
                    result.parts[k] = {fetching: false, fetched: true, html: v};
                });
            }
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)], Immutable.fromJS(result));
            this.update();
        }
    },
    onGetMorePageFailure: function(page_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id)],{
                title: 'Error',
                error: true,
                content: data || {error: 'A problem occurred'}});
             this.update();
        }
    },
    onRemovePage: function(page_id){
        this.pages = this.pages.splice(this.getIndex(page_id), 1);
        this.update();
    },
    onPopoverOpened: function(viewer_id, page_id, popover){
        var page = this.getById(page_id);
        popover.time = popover.time || (new Date()).getTime();
        var result = {};
        result[popover.id] = popover;
        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers'], result);
        this.update();
    },
    onSectionSummaryOpened: function(viewer_id, page_id, section_data){
        var page = this.getById(page_id);
        var result = {} ;
        result[section_data.id] = section_data;
        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data'], result);
        this.update();
    },
    // todo, remove
    onPopoverUpdate: function(viewer_id, page_id, popover){
        var page = this.getById(page_id);
        this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover.id], popover);
        this.update();
    },

    onRequestPopoverData: function(page_id, popover_id){;
        var page = this.getById(page_id);
        if(page){
            var popover = page.get('popovers').get(popover_id);
            if(popover && !popover.get('fetching') && !popover.get('fetched')){
                this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                    {fetching: true});
                var get = popover.get('query') ?
                    request.get('/query', popover.get('query').toJS()) :
                    request.get(popover.get('query_string'));
                get
                    .promise()
                    .then(function(response){ Actions.requestPopoverData.completed(page_id, popover_id, response.body);})
                    .catch(function(response){ Actions.requestPopoverData.failure(page_id, popover_id, response.body);});
                this.update();
            }
        }
    },
    onRequestPopoverDataCompleted: function(page_id, popover_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                _.extend({fetched: true, fetching: false}, data));
            this.update();
        }
    },
    onRequestPopoverDataFailure: function(page_id, popover_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'popovers', popover_id],
                _.extend({fetched: true, fetching: false, error: true}, data));
            this.update();
        }
    },
    onRequestSectionReferences: function(page_id, section_id){
        var page = this.getById(page_id);
        if(!page.getIn(['section_data', section_id, 'fetching']) &&
            !page.getIn(['section_data', section_id, 'fetched'])){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                {fetching: true});
            request.get('/section_references')
                .query({
                    document_id:  page.getIn(['section_data', section_id, 'document_id']),
                    govt_ids: (page.getIn(['section_data', section_id, 'govt_ids']).toJS() || []),
                    target_path: page.getIn(['section_data', section_id, 'target_path']),
                })
                .promise()
                .then(function(response){ Actions.requestSectionReferences.completed(page_id, section_id, response.body); })
                .catch(function(response){ Actions.requestSectionReferences.failure(page_id, section_id, response.body); });
            this.update();
        }
    },
    onRequestSectionReferencesCompleted: function(page_id, section_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                    _.extend({error: true, fetched: true, fetching: false}, data));
            this.update();
        }
    },
    onRequestSectionReferencesFailure: function(page_id, section_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), 'section_data', section_id],
                   _.extend( {error: true, fetched: true, fetching: false}, data));
            this.update();
        }
    },


    onRequestSubResource: function(resource, page_id){
        var page = this.getById(page_id);
        if(page && _.values(RESOURCE_TYPES).indexOf(resource) >= 0){
            if(!page.getIn([resource, 'fetching']) && !page.getIn([resource, 'fetched']) && !page.get('error')){
                this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), resource], {fetching: true});
                request.get('/'+resource+'/'+page.get('content').get('document_id'))
                    .promise()
                    .then(function(response){ Actions.requestSubResource.completed(resource, page_id, response.body); })
                    .catch(function(response){ Actions.requestSubResource.failure(resource, page_id, response.body); });
                this.update();
            }
        }
    },
    onRequestSubResourceCompleted: function(resource, page_id, data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), resource],
                    _.extend({fetched: true, fetching: false}, data));
            this.update();
        }
    },
    onRequestSubResourceFailure: function(resource, page_id ,data){
        var page = this.getById(page_id);
        if(page){
            this.pages = this.pages.mergeDeepIn([this.getIndex(page_id), resource],
                    _.extend({error: true, fetched: true, fetching: false}, data));
            this.update();
        }
    }
});



module.exports = PageStore;