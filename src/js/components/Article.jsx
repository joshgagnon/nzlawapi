"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var Actions = require('../actions/Actions');
var Popover = require('./Popover.jsx');
var ArticleOverlay= require('./ArticleOverlay.jsx');
var MQ = require('./Responsive.jsx');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var Utils = require('../utils');
var Immutable = require('immutable');

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



var articleLocation = {
    _findCurrent: function(){
        var target = $('.current', this.getDOMNode()).last();
        var locs = Utils.getLocation(target).locs;
        var doc_type = this.props.content.getIn(['query', 'doc_type']);
        var document_id = this.props.content.getIn(['query', 'document_id'])
        var links = [{
            repr: this.props.content.get('title'),
            title: this.props.content.get('title'),
            query:{
                doc_type: doc_type,
                document_id: document_id
            }
        }]
        for(var i=0;i<locs.length;i++){
            var loc = locs.slice(0, i+1).join('');
            links.push({
                repr: locs[i],
                title: this.props.content.get('title') + ' '+ loc,
                query:{
                    doc_type: doc_type,
                    document_id: document_id,
                    find: 'location',
                    location: loc
                }
            });
        }
        Actions.articleFocusLocation(links);
    },
    componentDidMount: function(){
        this._findCurrent();
    },
    componentDidUpdate: function(){
       this._findCurrent();
    }
}

var ArticleSkeletonContent = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        articleLocation
    ],
    scroll_threshold: 4000,
    fetch_threshold: 12000,
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this._refs = {};
        var heights = this.props.content.getIn(['heights']).toJS();
        var widths = _.map(_.keys(heights), Number).sort(function(a,b){ return a - b; });
        this.measured_heights = {};
        this.calculated_heights = {};
        this._visible = {};
        this._child_ids = {}
        this._child_locations = {};
        this._skeleton_locations = {};
        this._part_count = this.props.content.getIn(['heights', widths[0]+'' ]).size;
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
                this.onJumpTo(this.props.viewer_id, this.props.view.getIn(['positions', this.props.page_id]).toJS())
            }
            this.setSubVisibility();
            this.setupSkeletonScroll();
            this.updateSkeletonScroll();

        }
    },
    componentDidUpdate: function(){
        this.popRefs();
        this.resizeSkeleton();
        this.setSubVisibility();
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container');
    },
    setupSkeletonScroll: function(){
        var $parent = this.getScrollContainer();
        this.debounce_scroll = _.debounce(this.updateSkeletonScroll, 0);
        $parent.on('scroll', this.debounce_scroll);
        this.debounce_visibility = _.debounce(this.setSubVisibility, 300);
        $parent.on('scroll',  this.debounce_visibility);
    },
    updateSkeletonScroll: function(){
        var self = this;
        var find_current_part = function(top){
            var ordered_skeleton = _.keys(self._skeleton_locations).sort(function(a,b){return (a|0)-(b|0)})
                .map(function(p){
                    return {value: p, height: self._skeleton_locations[p].root}
                });
            var key = _.sortedIndex(ordered_skeleton, {height: top}, 'height');
            var part = Math.max(0, key-1)+'';
            if(!self._skeleton_locations[part].sorted_children || !self._skeleton_locations[part].sorted_children.length ){
                return self._refs[part];
            }
            var child_key = _.sortedIndex(self._skeleton_locations[part].sorted_children, [null, top-self._skeleton_locations[part].root], _.last);
            return self._skeleton_locations[part].sorted_children[child_key];
        };
        if(self.isMounted()){
            var top = self.getScrollContainer().scrollTop();
            var $part = $(find_current_part(top));
            var repr = Utils.getLocation($part).repr;
            var id = $part.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
            if(repr){
                Actions.articlePosition(self.props.viewer_id, self.props.page_id,
                    {pixel: top, repr: repr, id: id});
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
            if(self.props.content.getIn(['parts', k])){
                self.measured_heights[k] = v.getDOMNode().clientHeight;
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
    },
    recalculateOffsets: function(index){
        for(var i=index;i < this._part_count.length; i++){
            var key = i+''
            this._skeleton_locations[key].root = this._refs[key].offsetTop;
        }
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
                r
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
            var old_height = this._refs[k].clientHeight
            this._refs[k].style.height = 'auto';
            this._refs[k].innerHTML = parts.getIn([k, 'html']);
            this.measured_heights[k] =  this._refs[k].clientHeight;
            if(old_height !== this.measured_heights[k]){
                height_change = true;
            }
            this._refs[k].setAttribute('data-visible', true);
            this._refs[k].style.height = 'auto';
            this._refs[k].classList.remove('csspinner');

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
            // check for pending jumpTo for this part
        }
        else if(!parts.getIn([k, 'html'])){
            this._refs[k].classList.add('csspinner');
        }
        return height_change;
    },
    hidePart: function(k){
        this._refs[k].innerHTML = '';
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
        this.updateSkeletonScroll();
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
                target = $(this._refs[this._child_ids[jump.id]]);
                this._delayed_jump = {ref: this._child_ids[jump.id], jump:jump};
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
            container.animate({scrollTop: container.scrollTop()+target.position().top + 4}, 0);
        }
        else if(jump.pixel){
            this.getScrollContainer().scrollTop(jump.pixel);
        }
        else{
            return 'Not Found';
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
        articleLocation
    ],
    scroll_threshold: 4000,
    fetch_threshold: 12000,
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
        return $(this.getDOMNode()).parents('.tab-content, .results-container');
    },
    setupScroll: function(){
        this.offset = 100;
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = self.getScrollContainer().scrollTop();
            var i = _.sortedIndex(_.map(store, function(x){ return x.offset; }), top)
            return store[Math.max(Math.min(0, i), store.length -1)].target;
        };
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var offset = self.getScrollContainer().offset().top;
                var $el = $(find_current(self.locations));
                var result = Utils.getLocation($el).repr;
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
                if(result){
                    Actions.articlePosition(self.props.viewer_id, self.props.page_id,
                        {pixel: self.getScrollContainer().scrollTop() + self.offset, repr: result, id: id});
                }
            }
        }, 0);
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
            container.animate({scrollTop: container.scrollTop()+target.position().top + 4}, jump.noscroll || this.isSkeleton() ? 0: 300);
        }
        else{
            // GO TO FULL
            Actions.newPage({
                title: this.props.content.get('title'),
                query: {doc_type:
                this.props.content.get('doc_type'),
                find: 'full',
                id: this.props.content.get('document_id')}},
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

 var Popovers = React.createClass({
    shouldComponentUpdate: function(newProps){
        return (this.props.popoverView !== newProps.popoverView) || (this.props.popoverData !== newProps.popoverData)
    },
    render: function(){
        return <div>{ this.props.popoverView.map(function(key){
                var data = this.props.popoverData.get(key);
                return !data ? null : (<Popover.Popover placement="auto" viewer_id={this.props.viewer_id} {...data.toJS()} page_id={this.props.page_id} id={key} key={key} />)
            }, this).toJS()}</div>
    }
 });



var MobilePopovers = React.createClass({
    shouldComponentUpdate: function(newProps){
        return (this.props.popoverView !== newProps.popoverView) || (this.props.popoverData !== newProps.popoverData)
    },
    closeAll: function(){
        this.props.popoverView.map(function(key){
            Actions.popoverClosed(this.props.viewer_id, this.props.page_id, key);
        }, this),toJS();
    },
    render: function(){
        var last = this.props.popoverView.last();
        if(last !== undefined){
            var pop = this.props.popoverData.get(last);
            return <div className="mobile-popovers">
                    <Popover.MobilePopover {...pop.toJS()} page_id={this.props.page_id} closeAll={this.closeAll}/>
                </div>
        }
        return <div/>
    }
});


 module.exports = React.createClass({
    interceptLink: function(e){
        var link = $(e.target).closest('a:not([target])');

        if(link.length){
            e.preventDefault();
            if(link.attr('data-link-id')){
                var url = link.attr('data-href');
                if(url.indexOf('/') === -1){
                    url = 'instrument/'+url;
                }
                Actions.popoverOpened(this.props.viewer_id, this.props.page.get('id'),
                    {
                        type: 'link',
                        title: link.text(),
                        id: link.attr('data-link-id'),
                        target: link.attr('data-target-id'),
                        source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                        positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                        positionTop:link.position().top+ this.refs.articleContent.getScrollContainer().scrollTop(),
                        fetched: false,
                        url: '/link/'+url
                    });
                }
            else if(link.attr('data-def-id')){
               Actions.popoverOpened(this.props.viewer_id, this.props.page.get('id'),
                    {
                    type: 'definition',
                    title: link.text(),
                    id: link.attr('data-def-idx'),
                    positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                    positionTop:link.position().top + this.refs.articleContent.getScrollContainer().scrollTop(),
                    source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                    fetched: false,
                    url: '/definition/'+this.props.page.getIn(['content', 'document_id'])+'/'+link.attr('data-def-id')
                });
            }
            else if(link.closest('[id]').length){
                var $target = link.closest('[id]');
                var title = this.props.page.getIn(['content', 'title']) + ' ' + $target.attr('data-location') ;
                var ids = $target.find('id').map(function(){
                    return this.attributes.id;
                }).toArray();
                ids.push($target.attr('id'));
                Actions.sectionSummaryOpened(
                    this.props.viewer_id,
                    this.props.page.get('id'),
                    {id: $target.attr('id'),
                    document_id: this.props.page.getIn(['content', 'document_id']),
                    title: this.props.page.getIn(['content', 'title']) +' '+ Utils.getLocation($target).repr,
                    govt_ids: ids
                });
            }
        }
        else if($(e.target).is('span.label') && $(e.target).closest('[data-location]').length){
            var $target = $(e.target).closest('[data-location]')
            var location = Utils.getLocation($target);
            var title = this.props.page.getIn(['content', 'title']) +' '+ location.repr;
            Actions.popoverOpened(this.props.viewer_id, this.props.page.get('id'),
                    {
                    type: 'location',
                    title: title,
                    id: location.repr,
                    positionLeft: $target.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                    positionTop:$target.position().top + this.refs.articleContent.getScrollContainer().scrollTop(),
                    source_sel: Utils.locationsToSelector(location.locs),
                    fetched: false,
                    format: 'fragment',
                    url: Utils.queryUrlJSON({
                        document_id: this.props.page.getIn(['content', 'document_id']),
                        find: 'location',
                        location: location.repr,
                        doc_type: this.props.page.getIn(['content', 'doc_type'])
                    }),
                });
        }
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    componentDidUpdate: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
       // if loading position popovers
       // TODO, minimize running this
       if(this.props.page.get('content')){
           var popovers = this.props.view.getIn(['popovers', this.props.page.get('id')]);
           if(popovers){
               popovers.forEach(function(p){
                    var pop = this.props.page.getIn(['popovers', p]);
                    if(pop && !pop.get('positionLeft') && !pop.get('positionTop')){
                        var link = $(pop.get('source_sel'), this.getDOMNode());
                        if(link.length){
                            Actions.popoverUpdate(this.props.viewer_id, this.props.page.get('id'), {
                                id: pop.get('id'),
                                positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                                positionTop: link.position().top + this.refs.articleContent.getScrollContainer().scrollTop(),
                            });
                        }
                    }
               }, this);
            }
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
    render: function(){
        // perhaps swap popovers for different view on mobile
        if(!this.props.page.get('content')){
            return <div className="search-results"><div className="full-csspinner" /></div>
        }
        return <div className="legislation-result" onClick={this.interceptLink} >
           { this.warningsAndErrors() }
            <ArticleOverlay page={this.props.page} viewer_id={this.props.viewer_id} />

            { this.props.page.getIn(['content', 'format']) === 'skeleton' ?

           <ArticleSkeletonContent ref="articleContent"
                content={this.props.page.get('content') }
                parts={this.props.page.get('parts') }
                viewer_id={this.props.viewer_id}
                view={this.props.view}
                page_id={this.props.page.get('id')} />    :
          <ArticleContent ref="articleContent"
                content={this.props.page.get('content') }
                viewer_id={this.props.viewer_id}
                view={this.props.view}
                page_id={this.props.page.get('id')} /> }

            <MQ minWidth={480}>
                { this.props.view.getIn(['popovers', this.props.page.get('id')]) ?
                <Popovers
                    popoverData={this.props.page.get('popovers')}
                    popoverView={this.props.view.getIn(['popovers', this.props.page.get('id')])}
                    viewer_id={this.props.viewer_id}
                    page_id={this.props.page.get('id')} />
                : null }
            </MQ>
            <MQ maxWidth={480}>
                { this.props.view.getIn(['popovers', this.props.page.get('id')]) ?
                <MobilePopovers
                    popoverData={this.props.page.get('popovers')}
                    popoverView={this.props.view.getIn(['popovers', this.props.page.get('id')])}
                    viewer_id={this.props.viewer_id}
                    page_id={this.props.page.get('id')} />
                : null }
            </MQ>
        </div>
    }
 });
