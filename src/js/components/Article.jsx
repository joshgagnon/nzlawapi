"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/Glyphicon');

var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ArticleStore = require('../stores/ArticleStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Popover = require('./Popover.jsx');

require('bootstrap');


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



module.exports = React.createClass({
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
       page: React.PropTypes.object.isRequired,
       view_settings: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this.heights = {};
        return {visible: {}};
    },
    get_definition: function(id){
        return this.props.page.content.definitions[id];
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
        return this.props.page.content.partial;
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
                result += $el.attr('data-location');
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');

                Actions.articlePosition({pixel: $(self.getDOMNode()).parents('.tab-content, .results-container').scrollTop() + self.offset, repr: result, id: id});
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
            if(self.props.page.content && self.props.page.content.parts && self.props.page.content.parts[k]){
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
                        return _.contains(self.props.page.requested_parts, k) || self.props.page.content.parts[k];
                    });
                    if(to_fetch.length){
                        Actions.getMorePage(this.props.page, {requested_parts: to_fetch});
                    }
                });
            }
        }
    },
    shouldComponentUpdate: function(newProps, newState){
        //console.log(newProps);
        return true;
    },
    render: function(){
        console.log('article render')
        if(this.props.page.content.error){
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
        return <div className="legislation-result"><div className="article-error"><p className="text-danger">{this.props.page.content.error}</p></div></div>
    },
    renderPopovers: function(){
        var self = this;
        return (this.props.view_settings.popovers || []).map(function(key){
                var data = this.props.page.popovers[key];
                return (<Popover placement="auto" viewer_id={this.props.viewer_id} {...data} page={this.props.page} id={key} key={key} />)
            }, this);
    },

    renderStandard: function(){
        return <div className="legislation-result" >
                <div onClick={this.interceptLink} dangerouslySetInnerHTML={{__html:this.props.page.content.html_content}} />
                {this.renderPopovers()}
            </div>
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
                if(self.state.visible[hook] && self.props.page.content.parts[hook]){
                    //attributes.style = {height: 'auto'};
                    attributes['dangerouslySetInnerHTML'] = {__html: self.props.page.content.parts[hook]};
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
        return <div className="legislation-result" onClick={this.interceptLink}>
                {to_components(this.props.page.content.skeleton)}
                {this.renderPopovers()}
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
        if(page.id !== this.props.page.id) return;
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
            container.animate({scrollTop: container.scrollTop()+target.position().top + 1}, jump.noscroll ? 0: 300);
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
    },
    interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            if(link.attr('href') !== '#'){
                if(link.attr('data-link-id')){
                    Actions.popoverOpened(this.props.viewer_id, this.props.page,
                        {
                        type: 'link',
                        title: link.text(),
                        id: link.attr('data-link-id'),
                        target: link.attr('data-target-id'),
                        source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                        positionLeft: link.position().left + this.getScrollContainer().scrollLeft(),
                        positionTop:link.position().top+ this.getScrollContainer().scrollTop(),
                        fetched: false,
                        url: link.attr('href')
                    });
                }
            }
            else if(link.attr('data-def-id')){
               Actions.popoverOpened(this.props.viewer_id, this.props.page,
                    {
                    type: 'definition',
                    title: link.text(),
                    id: link.attr('data-def-idx'),
                    positionLeft: link.position().left + this.getScrollContainer().scrollLeft(),
                    positionTop:link.position().top + this.getScrollContainer().scrollTop(),
                    source_sel: '[data-def-idx="'+link.attr('data-link-idx')+'"]',
                    fetched: false,
                    url: '/definition/'+this.props.page.content.id+'/'+link.attr('data-def-id')
                });
            }
        }
     }
});