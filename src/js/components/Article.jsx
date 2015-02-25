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
var MQ = require('react-responsive');



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
    scroll_threshold: 5000,
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this.heights = {};
        return {visible: {}};
    },
    componentDidMount: function(){
        this.setup_scroll();
        if(this.isPartial()){
            this.resizeSkeleton();
            this.check_sub_visibility();
        }
    },
    componentDidUpdate: function(){
        this.resizeSkeleton();
    },
    isPartial: function(){
        return this.props.content.get('partial');
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container')
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
        this.debounce_visibility = _.debounce(this.check_sub_visibility, 10, {
          'maxWait': 300
        });
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var result = ''
                var offset = self.getScrollContainer().offset().top;
                if(self.scrollHeight !== $(self.getDOMNode()).height()){
                    self.refresh();
                }
                var $el = $(find_current(self.locations));
                if(!$el.attr('data-location-no-path')){
                    result = $el.parents('[data-location]').not('[data-location-no-path]').map(function(){
                        return $(this).attr('data-location');
                    }).toArray().reverse().join('');
                }
                result += $el.attr('data-location') || '';
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
                if(result){
                    Actions.articlePosition({pixel: $(self.getDOMNode()).parents('.tab-content, .results-container').scrollTop() + self.offset, repr: result, id: id});
                }
            }
            }, 0);
        var $parent = this.getScrollContainer();
        $parent.on('scroll', this.debounce_scroll);
        if(this.isPartial()){
            this.debounce_visibility();
            $parent.on('scroll', this.debounce_visibility);
            $(window).on('resize', this.reset_heights);
        }
    },
    reset_heights: function(){
        this.heights = {};
    },
    calculate_height: function(count, width){
        return 500;
    },
    resizeSkeleton: function(){
        var self = this;
        _.each(this.state.visible, function(v, k){
            if(self.props.get('content') && self.props.content.parts && self.props.content.parts[k]){
                self.heights[k] = self.refs[k].getDOMNode().outerHeight;
                //console.log(k, self.heights[k], self.heights)
            }
        });
    },
    check_sub_visibility: function(){
        if(this.isMounted()){
            var self = this;
            var visible = {};
            var top = this.getScrollContainer().scrollTop();
            var height = this.getScrollContainer().height();
            var change = false;
            _.each(this.refs, function(r, k){
                if($(r.getDOMNode()).isOnScreen(self.scroll_threshold)){
                    visible[k] = true;
                }
            });
            if(!_.isEqual(visible, this.state.visible)){
                this.setState({visible: visible}, function(){
                    var to_fetch = _.reject(_.keys(self.state.visible), function(k){
                        return _.contains(self.props.requested_parts, k) || self.props.content.parts[k];
                    });
                    if(to_fetch.length){
                        Actions.getMorePage(this.props.page, {requested_parts: to_fetch});
                    }
                });
            }
        }
    },
    shouldComponentUpdate: function(newProps, newState){
        console.log('shoud',this.props.content !== newProps.content);
        //bug getting here
        return this.props.content !== newProps.content;
    },
    render: function(){
        console.log('article render')
        if(this.props.content.get('error')){
            return this.renderError()
        }
        else if(this.isPartial()){
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
        //console.log('render')
        var id = 0;
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
                if(self.state.visible[hook] && self.props.content.parts[hook]){
                    //attributes.style = {height: 'auto'};
                    attributes['dangerouslySetInnerHTML'] = {__html: self.props.content.parts[hook]};
                }
                else if(self.state.visible[hook]){
                    attributes.className = (attributes.className || '') + ' csspinner traditional';
                    attributes.style = {height: self.heights[hook] || self.calculate_height(attributes['data-hook-length']|0, 1000)};
                }
                else{
                    attributes.style = {height: self.heights[hook] || self.calculate_height(attributes['data-hook-length']|0, 1000)};
                }
            }
            if(attributes['data-hook']){

                return React.DOM[v.tag](attributes);
            }

            return [React.DOM[v.tag](attributes, v['#text'], _.flatten(_.map(v.children, to_components))), v['#tail']];
        }
        return <div >
                {to_components(this.props.content.skeleton)}
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
        if(page.get('id') !== this.props.page_id) return;
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
            container.animate({scrollTop: container.scrollTop()+target.position().top + 10}, jump.noscroll ? 0: 300);
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

var FullArticleButton = React.createClass({
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    handleClick: function(){
        Actions.newPage({
            title: this.props.content.get('title'),
            query: {doc_type:
            this.props.content.get('doc_type'),
            find: 'full',
            id: this.props.content.get('document_id')}}, this.props.viewer_id)
    },
    render: function(){
        return  <button onClick={this.handleClick} className="btn btn-info">Full Article</button>
    }
})

var ArticlePDFButton = React.createClass({
    base_url: 'http://www.legislation.govt.nz/subscribe/',
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    render: function(){
        var url = this.props.content.getIn(['attributes', 'path']).replace('.xml', '.pdf');
        return  <a target="_blank" href={this.base_url + url} className="btn btn-info">PDF</a>
    }
})

var ArticleOverlay= React.createClass({
    propTypes: {
       page: React.PropTypes.object.isRequired,
    },
    render: function(){
        return <div className="article-overlay">
                { this.props.page.getIn(['content','format']) === 'fragment' ? <FullArticleButton
                    content={this.props.page.get('content')}
                    viewer_id={this.props.viewer_id}/> : null }

                { this.props.page.getIn(['content','attributes', 'path']) ? <ArticlePDFButton
                    content={this.props.page.get('content')}
                    viewer_id={this.props.viewer_id}/> : null }

            </div>
    }
})


var NotLatestVersion = React.createClass({
    render: function(){
        return <div className="alert alert-danger" role="alert"><strong>Warning</strong> This is not the latest reprint.</div>
    }
});

var ArticleError = React.createClass({
    render: function(){
        return <div className="alert alert-danger" role="alert"><strong>Error</strong> {this.props.error}</div>
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
                var target = link.closest('[id]')
                var title = this.props.page.title + ' ' + target.attr('data-location') ;
                console.log(target,title);
            }
        }
     },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'))
       }
    },
    componentDidUpdate: function(){
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
            return <div className="search-results"><div className="csspinner traditional" /></div>
        }
        return <div className="legislation-result" onClick={this.interceptLink} >
           { this.warningsAndErrors() }
          <ArticleOverlay page={this.props.page} viewer_id={this.props.viewer_id} />
          <ArticleContent ref="articleContent"
                content={this.props.page.get('content') }
                viewer_id={this.props.viewer_id}
                page_id={this.props.page.get('id')} />
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
