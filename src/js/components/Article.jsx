"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var Actions = require('../actions/Actions');
var Popovers = require('./Popovers.jsx');
var ArticleOverlay= require('./ArticleOverlay.jsx');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var ArticleHandlers = require('./ArticleHandlers.jsx')
var Utils = require('../utils');
var Immutable = require('immutable');
var ArticleLocation= require('./BreadCrumbs.jsx').ArticleLocation;

var _ = require('lodash');
var $ = require('jquery');


var ArticleJumpStore = Reflux.createStore({
    listenables: Actions,
    init: function(){

    },
    onArticleJumpTo: function(result, jump){
        this.trigger(result, jump);
    }
});


function stopPropagation(e){
    e.stopPropagation();
}


$.fn.isOnScreen = function(tolerance){
    tolerance = tolerance || 0;
    var viewport = {};
    viewport.top = $(window).scrollTop();
    viewport.bottom = viewport.top + $(window).height();
    var bounds = {};
    bounds.top = this.offset().top;
    bounds.bottom = bounds.top + this.outerHeight();
    return ((bounds.top <= viewport.bottom + tolerance) && (bounds.bottom >= viewport.top - tolerance));
};



var ArticleSkeletonContent = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        ArticleLocation
    ],
    scroll_threshold: 4000,
    fetch_threshold: 10000,
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this._refs = {};
        var heights = this.props.content.getIn(['heights']).toJS();
        var widths = _.map(_.keys(heights), Number).sort(function(a,b){ return a - b; });
        this.measured_heights = {};
        this.calculated_heights = {};
        this._part_count = this.props.content.getIn(['heights', widths[0]+'' ]).size;
        this._visible = {};
        this._child_ids = {}
        this._child_locations = {};
        this._skeleton_locations = {};
        return {
            widths: widths,
            height_ratio: Immutable.fromJS({key: 0, coeff: 1})
        };
    },
    componentDidMount: function(){
        if(!this.props.content.get('error')){
            this.popRefs();
            this.resizeSkeleton();
            if(this.props.view.getIn(['positions', this.props.page_id])){
                this.setupSkeletonScroll();
                this.updateSkeletonScroll();
                if(!this.onJumpTo(this.props.viewer_id, this.props.view.getIn(['positions', this.props.page_id]).toJS())){
                    this.setSubVisibility();
                }
            }
            else{
                this.setupSkeletonScroll();
                this.updateSkeletonScroll();
                this.setSubVisibility();
            }

        }
    },
    componentDidUpdate: function(){
        this.popRefs();
        this.resizeSkeleton();
        this.setSubVisibility();
    },
    getScrollContainer: function(){
        return this.props.getScrollContainer();
    },
    setupSkeletonScroll: function(){
        var $parent = this.getScrollContainer();
        this.debounce_scroll = _.debounce(this.updateSkeletonScroll, 10);
        $parent.on('scroll', this.debounce_scroll);
        this.debounce_visibility = _.debounce(this.setSubVisibility, 300);
        $parent.on('scroll',  this.debounce_visibility);
    },
    updateSkeletonScroll: function(){
        var self = this;
        var find_current_part = function(top){

            var key = _.sortedIndex(self._ordered_skeleton, {height: top}, 'height');
            // get current hook
            key = Math.min(Math.max(0, key-1), self._ordered_skeleton.length-1 );
            var part = key+'';
            // the current focus is a child of a hook, get it from precalculated index
            // if between hooks, get next id
            if(top > self._refs[part].offsetTop + self._refs[part].clientHeight && key<self._ordered_skeleton.length){
                part = (1+key)+'';
            }
            // if we haven't processesed children or there are no children
            if(!self._skeleton_locations[part].sorted_children || !self._skeleton_locations[part].sorted_children.length ){
                return self._refs[part];
            }
            var child_key = _.sortedIndex(self._skeleton_locations[part].sorted_children, [null, top-self._skeleton_locations[part].root], _.last) -1;
            child_key = Math.max(0, Math.min(self._skeleton_locations[part].sorted_children.length, child_key));
            return self._skeleton_locations[part].sorted_children[child_key] || self._refs[part];
        };
        if(self.isMounted()){
            var top = self.getScrollContainer().scrollTop();
            var $part = $(find_current_part(top));
            var repr = Utils.getLocation($part).repr;
            var id = $part.attr('id') || $part.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');

            if(repr){
                Actions.articlePosition(self.props.viewer_id, self.props.page_id,
                    {pixel: top, repr: repr, id: id ? '#'+id : id});
            }
        }
    },
    popRefs: function(){
        var self = this;
        this._child_ids = {}
        this._child_locations = {};
       $('[data-hook]', this.getDOMNode()).each(function(){
            var hook = this.getAttribute('data-hook');
            self._refs[hook] = this;
            (this.getAttribute('data-child-ids') || '').split(';').map(function(id){
                self._child_ids['#'+id] = hook;
            });
            (this.getAttribute('data-child-locations') || '').split(';').map(function(id){
                self._child_locations[id.trim()] = hook;
            });
       });
    },
    resizeSkeleton: function(){
        var self = this;
        if(!this.isMounted()){
            return;
        }
        _.each(self._refs, function(v, k){
            if(self.props.content.getIn(['parts', k]) && v.innerHTML){
                self.measured_heights[k] = v.clientHeight;
            }
        });
        var width = this.getDOMNode().clientWidth;
        var  height_ratio = {key: 0, coeff: 1}
        for(var i = 0; i < this.state.widths.length; i++){
            if(i === this.state.widths.length-1 && width >= this.state.widths[i]){
                height_ratio.coeff = 1;
                height_ratio.key = i;
            }
            else if(width >= this.state.widths[i]){
                var diff = this.state.widths[i+1] - this.state.widths[i];
                height_ratio.coeff =  (width - this.state.widths[i]) / diff;
                height_ratio.key = i
            }
        }
        var lower = this.props.content.getIn(['heights', this.state.widths[height_ratio.key]+'']).toJS();
        var upper = this.props.content.getIn(['heights', this.state.widths[Math.min(height_ratio.key+1, this.state.widths.length-1)]+'']).toJS();
        for(var i=0;i < lower.length; i++){
            var key = i+''
            this.calculated_heights[key] = (lower[i] -upper[i] ) * height_ratio.coeff  + lower[i];
            if(!this.measured_heights[key]){
                this._refs[key].style.height=this.calculated_heights[key]+'px';
            }
            this._skeleton_locations[key] = this._skeleton_locations[key] || {};
            this._skeleton_locations[key].root = this._refs[key].offsetTop;
        }
        this._ordered_skeleton = _.keys(this._skeleton_locations).sort(function(a,b){return (a|0)-(b|0)})
                .map(function(p){
                    return {value: p, height: self._skeleton_locations[p].root}
                });
    },
    recalculateOffsets: function(index){
        var self = this;
        for(var i=index;i < this._part_count.length; i++){
            var key = i+''
            this._skeleton_locations[key].root = this._refs[key].offsetTop;
        }
        this._ordered_skeleton = _.keys(self._skeleton_locations).sort(function(a,b){return (a|0)-(b|0)})
                .map(function(p){
                    return {value: p, height: self._skeleton_locations[p].root}
                });
        this.updateSkeletonScroll()
    },
    setSubVisibility: function(){
        if(this.isMounted()){
            var self = this;
            var top = this.getScrollContainer().scrollTop();
            var height = this.getScrollContainer().height();
            var change = false;
            var requested_parts = [];
             var resize_index =  this._part_count;
            _.each(this._refs, function(r, k){
                var show = $(r).isOnScreen(self.scroll_threshold);
                var local_change = false;
                if(this._visible[k] !== show){
                    local_change = true;
                }
                this._visible[k] = show;
                if(local_change){
                    if(show){
                        if(this.showPart(k, this.props.parts) && (k|0) < resize_index){
                            resize_index = k|0;
                        }
                    }
                    else{
                        this.hidePart(k);
                    }
                }
                change = change || local_change;
                // replace with above and below threadhols
                if($(r).isOnScreen(self.fetch_threshold)){
                    requested_parts.push(k);
                }
            }, this);

            if(resize_index < this._part_count){
                this.recalculateOffsets(resize_index);
            }
            if(change){
                Actions.getMorePage(this.props.page_id,
                    {requested_parts: requested_parts});
            }
        }
    },

    showPart: function(k, parts){
        var height_change = false;
        if(parts.getIn([k, 'html']) && !this._refs[k].innerHTML){
            var scroll_el = this.getScrollContainer()[0]
            var container_height = scroll_el.scrollHeight;
            var old_height = this._refs[k].offsetHeight;
           this._refs[k].style.height = 'auto';
           this._refs[k].classList.remove('csspinner');
            this._refs[k].innerHTML = parts.getIn([k, 'html']);
            this.measured_heights[k] =  this._refs[k].offsetHeight;
            if(old_height !== this.measured_heights[k]){
                height_change = true;
                var scroll = scroll_el.scrollTop;

                if(scroll + scroll_el.clientHeight > this._refs[k].offsetTop + this.measured_heights[k]){
                   this.getScrollContainer().scrollTop(scroll - (container_height - scroll_el.scrollHeight)) ;
                }
            }
            this._refs[k].setAttribute('data-visible', true);


            var top = this._refs[k].offsetTop;
            var pairs = _.map(this._refs[k].querySelectorAll('[data-location]'),
                function(el){ return [el, el.offsetTop - top];
            });
            var children =  _.zipObject(pairs.map(function(p){
                return [p[0].getAttribute('data-location'), p[1]]
            }));
            this._skeleton_locations[k] = {
                root: top,
                children: children,
                sorted_children: pairs
            };
            this.handleDelayedJump(k);
        }
        else if(!parts.getIn([k, 'html'])){
            this._refs[k].classList.add('csspinner');
        }
        return height_change;
    },
    hidePart: function(k){
        this._refs[k].innerHTML = '';
        // Hiding should not change document height by mroe than a rounding error
        this._refs[k].style.height = (this.measured_heights[k] || this.calculated_heights[k]) + 'px';
        this._refs[k].classList.remove('csspinner');
    },
    updateParts: function(parts){
        var resize_index =  this._part_count;
        _.map(this._visible, function(visible, k){
            if(visible){
                if(this.showPart(k, parts) && (k|0) < resize_index){
                    resize_index = k|0;
                }
            }
            else if(!visible){
                this.hidePart(k);
            }
        }, this);
        if(resize_index < this._part_count){
            this.recalculateOffsets(resize_index);
        }
    },
    shouldComponentUpdate: function(newProps, newState){
        // total hack job, perhaps move to direct pagestore listener
        if(this.props.parts !== newProps.parts){
            this.updateParts(newProps.parts);
        }
        return this.props.content !== newProps.content;
    },
    render: function(){
        console.log('article render')
        if(this.props.content.get('error')){
            return this.renderError()
        }
        return this.renderStandard();
    },
    renderError: function(){
        return <div className="article-error"><p className="text-danger">{this.props.content.error}</p></div>
    },
    renderStandard: function(){
        var classes = '';
        if(this.props.content.getIn(['attributes', 'latest'])){
            classes += 'latest-version ';
        }
        if(this.props.content.get('format') === 'fragment'){
            classes += 'fragment '
        }
        return <div className={classes} dangerouslySetInnerHTML={{__html:this.props.content.get('html_content')}} />
    },
    handleDelayedJump: function(ref){
        if(this._delayed_jump && this._delayed_jump.ref === ref ){
            this.onJumpTo(this.props.viewer_id, this._delayed_jump.jump);
            this._delayed_jump = null;
        }
    },
    onJumpTo: function(viewer_id, jump){
        this._delayed_jump;
        if(viewer_id!== this.props.viewer_id){
            return;
        }
        var target;
        if(jump.id){
            target = $(this.getDOMNode()).find(jump.id);
            if(!target.length){
                this._delayed_jump = {ref: this._child_ids[jump.id], jump:jump};
                target = $(this._refs[this._child_ids[jump.id]]);
            }
        }
        else if(jump.location && jump.location.length){
            var node = $(this.getDOMNode());
            for(var i=0;i<jump.location.length && node.length;i++){
                var new_node = node.find('[data-location^="'+jump.location[i]+'"]');
                if(!new_node.length){
                    new_node = $(this._refs[this._child_locations[jump.location[i]]]);
                    this._delayed_jump = {ref: this._child_locations[jump.location[i]], jump: jump};
                }
                node = new_node;
            }
            target = node;
        }
        if(target && target.length){
            var container = this.getScrollContainer();
            container.scrollTop(container.scrollTop()+target.position().top + 4);
            this.debounce_scroll();
        }
        else if(jump.pixel){
            this.getScrollContainer().scrollTop(jump.pixel);
        }
        else{
            return false;
        }
    },
    componentWillUnmount: function(){
        var $parent =  this.getScrollContainer();
        $parent.off('scroll', this.debounce_scroll);
        $parent.off('scroll',  this.debounce_visibility);
    }
});


var ArticleContent = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        ArticleLocation
    ],
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    componentDidMount: function(){
        if(!this.props.content.get('error')){
            this.setupScroll();
            if(this.props.view.getIn(['positions', this.props.page_id])){
                this.onJumpTo(this.props_viewer_id, this.props.view.getIn(['positions', this.props.page_id]).toJS());
            }
        }
    },
    getScrollContainer: function(){
        return this.props.getScrollContainer();
    },
    setupScroll: function(){
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = self.getScrollContainer().scrollTop();
            var i = _.sortedIndex(_.map(store, function(x){ return x.offset; }), top);
            return store[Math.min(Math.max(0, i), store.length -1)].target;
        };
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var offset = self.getScrollContainer().offset().top;
                var $el = $(find_current(self.locations));
                var result = Utils.getLocation($el).repr;
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
                if(result){
                    Actions.articlePosition(self.props.viewer_id, self.props.page_id,
                        {pixel: self.getScrollContainer().scrollTop() + offset, repr: result, id: id ? '#'+id : id});
                }
            }
        }, 300);
        var $parent = this.getScrollContainer();
        $parent.on('scroll', this.debounce_scroll);
    },

    shouldComponentUpdate: function(newProps, newState){
        return this.props.content !== newProps.content;
    },
    render: function(){
        console.log('article render')
        if(this.props.content.get('error')){
            return this.renderError()
        }
        return this.renderStandard();
    },
    renderError: function(){
        return <div className="article-error"><p className="text-danger">{this.props.content.error}</p></div>
    },
    renderStandard: function(){
        var classes = '';
        if(this.props.content.getIn(['attributes', 'latest'])){
            classes += 'latest-version ';
        }
        if(this.props.content.get('format') === 'fragment'){
            classes += 'fragment '
        }
        return <div className={classes} dangerouslySetInnerHTML={{__html:this.props.content.get('html_content')}} />
    },
    refresh: function(){
        var self = this;
        var pos = 'offset';
        this.locations = [];
        var offset = this.getScrollContainer().offset().top;
        this.scrollHeight = $(self.getDOMNode()).height();
        this.locations = self.locations.concat($(self.getDOMNode())
            .find('[data-location]')
            .map(function() {
                var $el = $(this);
                return ( $el.is(':visible') && [
                    {offset: $el[pos]().top - offset, target: this}
                ]) || null
            })
            .toArray())
        this.locations
            .sort(function(a, b) {
                return a.offset - b.offset
            });
    },
    onJumpTo: function(viewer_id, jump){
        if(viewer_id!== this.props.viewer_id){
            return;
        }
        var target;
        if(jump.location && jump.location.length){
            var node = $(this.getDOMNode());
            for(var i=0;i<jump.location.length;i++){
                node = node.find('[data-location^="'+jump.location[i]+'"]');
            }
            target = node;
        }
        else if(jump.id){
            target = $(this.getDOMNode()).find(jump.id);
        }
        if(target && target.length){
            var container = this.getScrollContainer();
            container.animate({scrollTop: container.scrollTop()+target.position().top + 4}, jump.noscroll ? 0: 300);
        }
        else{
            // GO TO FULL
            Actions.newPage({
                title: this.props.content.get('title'),
                query: {
                    doc_type:
                    this.props.content.get('doc_type'),
                    find: 'full',
                    document_id: this.props.content.get('document_id')}
                },
                this.props.viewer_id,
                {position: {id: jump.id, location: jump.location}
            });
            return 'Not Found';
        }
    },
    componentWillUnmount: function(){
        var $parent =  this.getScrollContainer();
        $parent.off('scroll', this.debounce_scroll);
    }
});


 module.exports = React.createClass({
    mixins: [ArticleHandlers, Popovers],
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    componentDidUpdate: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    warningsAndErrors: function(){
        if(this.props.page.getIn(['content', 'error'])){
            return <ArticleError error={this.props.page.getIn(['content', 'error'])}/>
        }
        else if(!this.props.page.getIn(['content', 'attributes', 'latest'])){
            return <NotLatestVersion />
        }
        return null;
    },
    getScrollContainer: function(){
        // to do, remove $
        return $(this.getDOMNode()).closest('.tab-content, .results-container')
    },
    overlayOffset: function(){
        return {'left': this.getScrollContainer().scrollLeft(), 'top': this.getScrollContainer().scrollTop()};
    },
    getDocumentId: function(target){
        return this.props.page.getIn(['content', 'document_id'])
    },
    render: function(){
        if(!this.props.page.get('content')){
            return <div className="search-results"><div className="full-csspinner" /></div>
        }
        if( this.props.page.getIn(['content', 'error'])){
            return <div className="legislation-result">
                { this.warningsAndErrors() }
                </div>
        }
        return <div className="legislation-result" onClick={this.interceptLink}>
           { this.warningsAndErrors() }
            <ArticleOverlay page={this.props.page} viewer_id={this.props.viewer_id} container={this} content={this.props.page.get('content') }/>
            { this.props.page.getIn(['content', 'format']) === 'skeleton' ?
           <ArticleSkeletonContent ref="content"
                getScrollContainer={this.getScrollContainer}
                content={this.props.page.get('content') }
                parts={this.props.page.get('parts') }
                viewer_id={this.props.viewer_id}
                view={this.props.view}
                page_id={this.props.page.get('id')} />    :
          <ArticleContent ref="content"
                getScrollContainer={this.getScrollContainer}
                content={this.props.page.get('content') }
                viewer_id={this.props.viewer_id}
                view={this.props.view}
                page_id={this.props.page.get('id')} /> }

            { this.renderFullPopovers({getScrollContainer: this.getScrollContainer}) }
            { this.renderMobilePopovers() }
        </div>
    }
 });
