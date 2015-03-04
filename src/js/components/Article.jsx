"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');

var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ArticleStore = require('../stores/ArticleStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Popover = require('./Popover.jsx');
var SectionSummary = require('./SectionSummary.jsx');
var ArticleOverlay= require('./ArticleOverlay.jsx');
var MQ = require('react-responsive');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var Perf = React.addons.Perf;
var Immutable = require('immutable');
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

function getLocationString($el){
    var result = ''
    if(!$el.attr('data-location-no-path')){
        result = $el.parents('[data-location]').not('[data-location-no-path]').map(function(){
            return $(this).attr('data-location');
        }).toArray().reverse().join('');
    }
    result += $el.attr('data-location') || '';
    return result;
}

// TODO, break into popovers, and article,
// return false on equality

var ArticleContent = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        /*     mixins: [Reflux.connectFilter(postStore,"post", function(posts) {
        posts.filter(function(post) {
           post.id === this.props.id;
        });
    }], */
    ],
    scroll_threshold: 4000,
    fetch_threshold: 12000,
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        if(this.isPartial()){
            this._refs = {};
            var heights = this.props.content.getIn(['heights']).toJS();
            var widths = _.map(_.keys(heights), Number).sort(function(a,b){ return a - b; });
            this.measured_heights = {};
            this.calculated_heights = {};
            this._visible = {};
            return {
                widths: widths,
                height_ratio: Immutable.fromJS({key: 0, coeff: 1})
            };
        }
        return {};
    },
    componentDidMount: function(){
        this.setup_scroll();
        if(this.isPartial()){

            if(!this.isJSONPartial()){
                this.popRefs();
                this.resizeSkeleton();
                this.setSubVisibility();
            }
        }
    },
    componentDidUpdate: function(){
        if(this.isPartial()){
            this.resizeSkeleton();
        }
    },
    isPartial: function(){
        return this.props.content.get('format') === 'skeleton';
    },
    isJSONPartial: function(){
        return !!this.props.content.get('skeleton');
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container');
    },
    setup_scroll: function(){
        this.offset = 100;
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = self.getScrollContainer().scrollTop();
            var i = _.sortedIndex(store.offsets, top) -1;
            return store.targets[Math.min(Math.max(0, i), store.targets.length -1)];
        };
        this.throttle_visibility = _.throttle(this.setSubVisibility, 300)
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var offset = self.getScrollContainer().offset().top;
                if(self.scrollHeight !== $(self.getDOMNode()).height()){
                    self.refresh();
                }
                var $el = $(find_current(self.locations));
                var result = getLocationString($el)
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
                if(result){
                    Actions.articlePosition({pixel: $(self.getDOMNode()).parents('.tab-content, .results-container').scrollTop() + self.offset, repr: result, id: id});
                }
            }
        }, 0);
        var $parent = this.getScrollContainer();
        //$parent.on('scroll', this.debounce_scroll);
        if(this.isPartial()){
            this.setSubVisibility();
            $parent.on('scroll',  this.throttle_visibility);
            //$parent.on('touchmove', this.debounce_visibility);
           // $(window).on('resize', this.reset_heights);
        }
    },
    reset_heights: function(){
        this.measured_heights = {};
    },
    popRefs: function(){
        var self = this;
       $('[data-hook]', this.getDOMNode()).each(function(){
            self._refs[this.getAttribute('data-hook')] = this;
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
        var upper = this.props.content.getIn(['heights', this.state.widths[Math.min(height_ratio.key+1, this.state.widths.length)]+'']).toJS();
        for(var i=0;i < lower.length; i++){
            var key = i+''
            this.calculated_heights[key] = (lower[i] -upper[i] ) * height_ratio.coeff  + lower[i];
            if(!this.measured_heights[key]){
                this._refs[key].style.height=this.calculated_heights[key]+'px';
            }
        }
    },
    setSubVisibility: function(){
        if(this.isMounted()){
            var self = this;
            var top = this.getScrollContainer().scrollTop();
            var height = this.getScrollContainer().height();
            var change = false;
            var requested_parts = [];
            _.each(this._refs, function(r, k){
                var show = $(r).isOnScreen(self.scroll_threshold);
                var local_change = false;
                if(this._visible[k] !== show){
                    local_change = true;
                }
                this._visible[k] = show;
                if(local_change){
                    if(show){
                        this.showPart(k, this.props.parts);
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

            if(change){
                console.log('set visible')
                console.log(requested_parts)
                Actions.getMorePage(this.props.page_id,
                    {requested_parts: requested_parts});
                //then hide and show
            }
        }
    },
    showPart: function(k, parts){
        if(parts.getIn([k, 'html']) && !this._refs[k].innerHTML){
            this._refs[k].innerHTML = parts.getIn([k, 'html']);
            this._refs[k].setAttribute('data-visible', true);
            this._refs[k].style.height = 'auto';
            this._refs[k].classList.remove('csspinner');
            this.measured_heights[k] = this._refs[k].clientHeight;
        }
        else if(!parts.getIn([k, 'html'])){
            this._refs[k].classList.add('csspinner');
        }
    },
    hidePart: function(k){
        this._refs[k].innerHTML = '';
        this._refs[k].style.height = (this.measured_heights[k] || this.calculated_heights[k]) + 'px';
        this._refs[k].classList.remove('csspinner');
    },
    updateParts: function(parts){
        _.map(this._visible, function(visible, k){
            if(visible){
                this.showPart(k, parts)
            }
            else if(!visible){
                this.hidePart(k);
            }
        }, this);
    },
    shouldComponentUpdate: function(newProps, newState){
        // total hack job
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
        else if(this.isPartial() && this.isJSONPartial()){
            return this.renderSkeleton();
        }
        else{
            return this.renderStandard();
        }
    },
    renderError: function(){
        return <div className="article-error"><p className="text-danger">{this.props.content.error}</p></div>
    },
    renderStandard: function(){
        return <div dangerouslySetInnerHTML={{__html:this.props.content.get('html_content')}} />
    },
    renderSkeleton: function(){
        var self = this;
        var attrib_transform = {'@class': 'className', '@style': 'fauxstyle', '@tabindex': 'tabIndex', '@colspan': 'colSpan'};
        var id = 0;
        var count =0;
        function to_components(v){
            var attributes = {}
            _.each(v, function(v, k){
                attributes['key'] = id++;
                if(attrib_transform[k]) attributes[attrib_transform[k]] = v
                else if(k[0] === '@') attributes[k.substring(1)] = v;
            });
            if(attributes['data-hook']){
                var hook = attributes['data-hook'];
                attributes['ref'] = hook;
                if(self.state.visible[hook] && self.props.content.getIn(['parts', hook])){
                    attributes['data-visible'] = true;
                    attributes['dangerouslySetInnerHTML'] = {__html: self.props.content.getIn(['parts', hook])};
                }
                else if(self.measured_heights[hook]){
                    attributes.style = {height: self.measured_heights[hook]};
                }
                else{
                    attributes.style = {height: self.calculated_heights[hook]};
                }
            }
            if(attributes['data-hook']){
                return React.DOM[v.tag](attributes);
            }
            count++;
            return [React.DOM[v.tag](attributes, v['#text'], _.flatten(_.map(v.children, to_components))), v['#tail']];
        }

        var components = this._components || to_components(this.props.content.get('skeleton').toJS());
        this._components = components;
        return <div>
                { this._components }
            </div>
    },
    refresh: function(){
        var self = this;
        var pos = 'offset';
        this.locations = {
            offsets: [],
            targets: []
        };
        var offset = this.getScrollContainer().offset().top;
        this.scrollHeight = $(self.getDOMNode()).height();
        $(self.getDOMNode())
            .find('[data-location]')
            .map(function() {
                var $el = $(this);
                return ( $el.is(':visible') && [
                    [$el[pos]().top, this]
                ]) || null
            })
            .sort(function(a, b) {
                return a[0] - b[0]
            })
            .each(function(){
                    self.locations.offsets.push(this[0] - offset);
                    self.locations.targets.push(this[1]);
                });
        this.hooks = {
            offsets: [],
            targets: []
        };

    },
    popoverJumpTo: function(){
        Actions.articleJumpTo(this.props.page, {
            id: '#' + this.props.target
        });
    },
    onJumpTo: function(page, jump){
        if(page.get('id') !== this.props.page_id){
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
            return 'Not Found';
        }
    },
    componentWillUnmount: function(){
        var $parent =  this.getScrollContainer();
        $parent.off('scroll', this.debounce_scroll);
        if(this.isPartial()){
            $parent.off('scroll', this.debounce_visibility);
            $(window).off('resize', this.reset_heights);
        }
    }
});

 var Popovers = React.createClass({
    shouldComponentUpdate: function(newProps){
        return (this.props.popoverView !== newProps.popoverView) || (this.props.popoverData !== newProps.popoverData)
    },
    render: function(){
        return <div>{ this.props.popoverView.map(function(key){
                var data = this.props.popoverData.get(key);
                return (<Popover.Popover placement="auto" viewer_id={this.props.viewer_id} {...data.toJS()} page_id={this.props.page_id} id={key} key={key} />)
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
                var target = link.closest('[id]');
                var title = this.props.page.title + ' ' + target.attr('data-location') ;
                var ids = target.find('id').map(function(){
                    return this.attributes.id;
                }).toArray();
                ids.push(target.attr('id'));
                Actions.sectionSummaryOpened(
                    this.props.viewer_id,
                    this.props.page.get('id'),
                    {id: target.attr('id'),
                    document_id: this.props.page.getIn(['content', 'document_id']),
                    title: this.props.page.get('title') +' '+ getLocationString(target),
                    govt_ids: ids
                });

            }
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
        return <div><div className="legislation-result" onClick={this.interceptLink} >
           { this.warningsAndErrors() }
            <ArticleOverlay page={this.props.page} viewer_id={this.props.viewer_id} />
          <ArticleContent ref="articleContent"
                content={this.props.page.get('content') }
                parts={this.props.page.get('parts') }
                viewer_id={this.props.viewer_id}
                page_id={this.props.page.get('id')} />
             { this.props.view.getIn(['section_summaries', this.props.page.get('id')]) &&
                this.props.view.getIn(['section_summaries', this.props.page.get('id')]).size ?
                <SectionSummary
                sectionData={this.props.page.get('section_data')}
                sectionView={this.props.view.getIn(['section_summaries', this.props.page.get('id')])}
                viewer_id={this.props.viewer_id}
                page_id={this.props.page.get('id')} />
                : null }
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

        </div>
    }
 });
