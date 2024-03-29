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
            this.update();
        }
    },
    pageUpdate: function(state){
        // if the active page is removed, we must change active
        var ids = state.pages.map(function(p){ return p.get('id')});
        var views = this.views;
        if(ids.size){
            _.map(['tab-0', 'tab-1'], function(k){
                if(!ids.contains(views.getIn([k, 'active_page_id']))){
                    views = views.setIn([k, 'active_page_id'],  ids.last());
                }
            }, this);
        }
        this.views = views;
        this.update();
    },
    onRemovePage: function(page_id){
        // clean up, don't publish
        var tabs = ['tab-0', 'tab-1'];
        for(var i=0; i<2;i++){
            this.views = this.views.deleteIn([tabs[i], 'settings', page_id]);
            this.views = this.views.deleteIn([tabs[i], 'popovers', page_id]);
            this.views = this.views.deleteIn([tabs[i], 'section_summaries', page_id]);
            this.views = this.views.deleteIn([tabs[i], 'positions', page_id]);
        }
    },
    onCloseView: function(viewer_id){
        if(viewer_id === 'print'){
            Actions.deactivatePrintMode();
        }
        if(viewer_id === 'tab-1'){
            Actions.deactivateSplitMode();
        }
        if(viewer_id === 'tab-0'){
            // swap tabs over
            var t0 = this.views.get('tab-0');
            var t1 = this.views.get('tab-1');
            this.views = this.views.set('tab-0', t1);
            this.views = this.views.set('tab-1', t0);
            this.update();
            Actions.deactivateSplitMode();
        }
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
    onShowFind: function(viewer_id, page_id){
        this.prepPage(viewer_id, page_id);
        if(!this.views.getIn([viewer_id, 'settings', page_id,'find'])){
            this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id ],
                {find: true});
            this.update();
        }
    },
    onCloseFind: function(viewer_id, page_id){
        this.prepPage(viewer_id, page_id);
        if(this.views.getIn([viewer_id, 'settings', page_id, 'find'])){
            this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id ],
                {find: false});
            this.update();
        }
    },
    onShowPage: function(viewer_id, page_id, options){
        this.prepPage(viewer_id, page_id);
        this.views = this.views.mergeDeepIn([viewer_id], {active_page_id: page_id});
        if(options){
            this.views = this.views.mergeDeepIn([viewer_id, 'settings', page_id], options);
            if(options.position){
                this.views = this.views.setIn([viewer_id, 'positions', page_id], Immutable.Map());
                this.views = this.views.mergeDeepIn([viewer_id, 'positions', page_id], options.position);
                if(viewer_id === 'tab-0' && page_id === this.views.getIn([viewer_id, 'active_page_id'])){
                    Actions.articleJumpTo(viewer_id, options.position);
                }
            }
        }
        this.update();
    },
    onShowNewPage: function(){
        this.onShowPage.apply(this, arguments);
    },
    onPopoverOpened: function(viewer_id, page_id, link_data){
        this.prepPage(viewer_id, page_id);
        var open = this.views.getIn([viewer_id, 'popovers', page_id], Immutable.Map())
        var obj = {};
        obj[link_data.id] = _.pick(link_data, 'left', 'top', 'time', 'stack');
        if(obj[link_data.id].stack === null){
                var prev = open
                    .sort(function(a, b){ return (a.get('time')||0) - (b.get('time')||0)})
                    .keySeq().last();
                if(prev){
                    obj[link_data.id].stack  = this.views.getIn([viewer_id, 'popovers', page_id, prev, 'stack']) ? 0 : 1;
                }

            obj.stack
        }
        if(!obj[link_data.id].time){
            obj[link_data.id].time = (new Date()).getTime();
        }
        this.views = this.views.mergeDeepIn([viewer_id, 'popovers', page_id], obj)
        this.update();
    },
    onPopoverClosed: function(viewer_id, page_id, link_id){
        var open = this.views.getIn([viewer_id, 'popovers', page_id]);
        this.views = this.views.setIn([viewer_id, 'popovers', page_id], open.remove(link_id));
        this.update();
    },
     onPopoverMove: function(viewer_id, page_id, position){
        var open = this.views.getIn([viewer_id, 'popovers', page_id], Immutable.Map())
        if(open.get(position.id)){
            this.views = this.views.mergeDeepIn([viewer_id, 'popovers', page_id, position.id], position)
            this.update();
        }
    },
    onSectionSummaryOpened: function(viewer_id, page_id, section_data){
        var self = this;
        this.prepPage(viewer_id, page_id);
        var open = this.views.getIn([viewer_id, 'section_summaries', page_id], Immutable.List())
        if(!open.contains(section_data.id)){
            this.views = this.views.setIn([viewer_id, 'section_summaries', page_id], open.push(section_data.id))
            this.update();
        }
    },
    onSectionSummaryClosed: function(viewer_id, page_id, section_id){
        var open = this.views.getIn([viewer_id, 'section_summaries', page_id]);
        this.views = this.views.setIn([viewer_id, 'section_summaries', page_id], open.remove(open.indexOf(section_id)));
        this.update();
    },

    onArticlePosition: function(viewer_id, page_id, position){
        this.views = this.views.setIn([viewer_id, 'positions', page_id], Immutable.fromJS(position));
        this.update();

    }
});
