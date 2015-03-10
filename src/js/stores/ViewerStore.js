"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var PageStore = require('./PageStore');
var PrintStore = require('./PrintStore');
var _ = require('lodash');
var Immutable = require('immutable');

module.exports =  Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.listenTo(PageStore, this.pageUpdate);
        this.listenTo(PrintStore, this.printUpdate);
        this.views = this.getDefaultData();
    },
    getDefaultData: function(){
        return Immutable.fromJS({'tab-0': this.getDefault(), 'tab-1': this.getDefault(), 'print': []});
    },
    getInitialState: function(){
        return {views: this.views};
    },
    onSetState: function(data){
        if(data.get('views')){
            var views = this.getDefaultData().toJS();
                data.get('views');
                _.forOwn(data.get('views').toJS(), function(v, k){
                    views[k] = _.defaults(v, this.getDefault())
                }, this)
            this.views = Immutable.fromJS(views);
            this.trigger({views: this.views});
        }
    },
    pageUpdate: function(state){
        // if the active page is removed, we must change active
        var ids = state.pages.map(function(p){ return p.get('id')});
        if(ids.size){
            this.views.map(function(v, k){
                if(!ids.contains(this.views.getIn([k, 'active_page_id']))){
                    this.views = this.views.setIn([k, 'active_page_id'],  ids.last());
                }
            }, this);
        }
        this.trigger({views: this.views});
    },
    printUpdate: function(state){
        var ids = state.print.map(function(p){ return p.get('id');}).toJS();
        var new_ids = Immutable.List(_.difference(ids, this.views.get('print').toJS()));
        if(new_ids.size){
            this.views = this.views.set('print',  this.views.get('print').concat(new_ids));
        }
        this.views = this.views.set('print', Immutable.List(_.intersection(this.views.get('print').toJS(), ids)));
        this.trigger({views: this.views});
    },
    onPrintMovePosition: function(print_id, pos){
        var i = this.views.get('print').indexOf(print_id);
        var array = this.views.get('print').toJS();
        pos = (pos + array.length)  % array.length;
        array.splice(pos, 0, array.splice(i, 1)[0])
        this.views = this.views.set('print', Immutable.List(array));
        this.trigger({views: this.views});
    },
    getDefault: function(){
        return {active_page_id: undefined, settings: {}, popovers: {}, section_summaries:{}, positions: {}}
    },
    update: function(){
        this.trigger({views: this.views});
    },
    prepPage: function(viewer_id, page_id){
        if(!this.views.getIn([viewer_id, 'settings', page_id])){
            this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id], {});
        }
        if(!this.views.getIn([viewer_id, 'popovers', page_id])){
            this.views = this.views.mergeDeepIn([viewer_id, 'popovers', page_id], {});
        }
        if(!this.views.getIn([viewer_id, 'section_summaries', page_id])){
            this.views = this.views.mergeDeepIn([viewer_id, 'section_summaries', page_id], {});
        }
        if(!this.views.getIn([viewer_id, 'positions', page_id])){
            this.views = this.views.mergeDeepIn([viewer_id, 'positions', page_id], {});
        }
    },
    onToggleAdvanced: function(viewer_id, page_id){
        this.prepPage(viewer_id, page_id);
        this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id ],
            {advanced_search: !this.views.getIn([viewer_id, 'settings', page_id,'advanced_search'])});
        this.update();
    },
    onShowPage: function(viewer_id, page_id, options){
        this.prepPage(viewer_id, page_id);
        this.views = this.views.mergeDeepIn([viewer_id], {active_page_id: page_id});
        this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id], options);
        this.update();
    },
    onShowNewPage: function(){
        this.onShowPage.apply(this, arguments);
    },
    onPopoverOpened: function(viewer_id, page_id, link_data){
        var self = this;
        this.prepPage(viewer_id, page_id);
        var open = this.views.getIn([viewer_id, 'popovers', page_id], Immutable.List())
        if(!open.contains(link_data.id)){
            this.views = this.views.setIn([viewer_id, 'popovers', page_id], open.push(link_data.id))
        }
        this.update();
    },
    onPopoverClosed: function(viewer_id, page_id, link_id){
        var open = this.views.getIn([viewer_id, 'popovers', page_id]);
        this.views = this.views.setIn([viewer_id, 'popovers', page_id], open.remove(open.indexOf(link_id)));
        this.update();
    },
    onSectionSummaryOpened: function(viewer_id, page_id, section_data){
        var self = this;
        this.prepPage(viewer_id, page_id);
        var open = this.views.getIn([viewer_id, 'section_summaries', page_id], Immutable.List())
        if(!open.contains(section_data.id)){
            this.views = this.views.setIn([viewer_id, 'section_summaries', page_id], open.push(section_data.id))
        }
        this.update();
    },
    onSectionSummaryClosed: function(viewer_id, page_id, section_id){
        var open = this.views.getIn([viewer_id, 'section_summaries', page_id]);
        this.views = this.views.setIn([viewer_id, 'section_summaries', page_id], open.remove(open.indexOf(section_id)));
        this.update();
    },

    onArticlePosition: function(viewer_id, page_id, position){
        this.views = this.views.mergeDeepIn([viewer_id, 'positions', page_id], position);
        this.update();

    }
});
