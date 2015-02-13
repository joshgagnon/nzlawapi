"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/Glyphicon');

var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
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
    scroll_threshold: 20000,
    propTypes: {
        result: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this.heights = {};
        return {visible: {}};
    },
    get_definition: function(id){
        return this.props.result.content.definitions[id];
    },
    componentDidMount: function(){
        this.setup_scroll();
        if(this.isPartial()){
            this.resize_skeleton();
            this.check_sub_visibility();
        }
    },
    componentDidUpdate: function(){
        this.resize_skeleton();
    },
    isPartial: function(){
        return this.props.result.content.partial;
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container')
    },
    setup_scroll: function(){
        this.offset = 100;
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = self.getScrollContainer().scrollTop() + self.offset;
            var i = _.sortedIndex(store.offsets, top) -1;
            return store.targets[Math.min(Math.max(0, i), store.targets.length -1)];
        };

        this.debounce_visibility = _.debounce(this.check_sub_visibility, 10, {
          'maxWait': 300
        });
        this.debounce_scroll = _.debounce(function(){
            var result = ''

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
        }, 0);
        var $parent = $(this.getDOMNode()).parents('.tab-content, .results-container');
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
        return Math.max(count/width * 50 -450, 28);
    },
    resize_skeleton: function(){
        var self = this;
        _.each(this.state.visible, function(v, k){
            if(self.props.result.content.parts[k]){
                self.heights[k] = $(self.refs[k].getDOMNode()).height();
                //console.log(k, self.heights[k], self.heights)
            }
        });
    },
    check_sub_visibility: function(){
        var self = this;
        var visible = {};
        var top = $(window).scrollTop() + self.offset;
        var height = $(window).height();
        var change = false;
        _.each(this.refs, function(r, k){
            if($(r.getDOMNode()).isOnScreen(self.scroll_threshold)){
                visible[k] = true;
            }
        });
        if(!_.isEqual(visible, this.state.visible)){
            //console.log(visible, this.state.visible)
            this.setState({visible: visible}, function(){
                var to_fetch = _.reject(_.keys(self.state.visible), function(k){
                    return _.contains(self.props.result.requested_parts, k) || self.props.result.content.parts[k];
                });
                if(to_fetch.length){
                    Actions.getMoreResult(this.props.result, {requested_parts: to_fetch});
                }
            });
        }
    },
    render: function(){
        if(this.props.result.content.error){
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
        return <div className="legislation-result"><div className="article-error"><p className="text-danger">{this.props.result.content.error}</p></div></div>
    },
    renderPopovers: function(){
        var self = this;
        return (this.props.result.open_popovers || []).map(function(link){
                return (<Popover placement="auto" {...link} onClose={self.popoverClose} onJumpTo={self.popoverJumpTo} key={link.id}/>)
            });
    },
    popoverClose: function(popover_id){
        Actions.popoverClosed(this.props.result, _.find(this.props.result.open_popovers, {id: popover_id}));
    },
    renderStandard: function(){
        return <div className="legislation-result" >
                <div onClick={this.interceptLink} dangerouslySetInnerHTML={{__html:this.props.result.content.html_content}} />
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
                if(self.state.visible[hook] && self.props.result.content.parts[hook]){
                    //attributes.style = {height: 'auto'};
                    attributes['dangerouslySetInnerHTML'] = {__html: self.props.result.content.parts[hook]};
                }
                else if(self.state.visible[hook]){
                    attributes.className = (attributes.className || '') + ' csspinner traditional';
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
                {to_components(this.props.result.content.skeleton)}
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
                    self.locations.offsets.push(this[0]);
                    self.locations.targets.push(this[1]);
                });
        this.hooks = {
            offsets: [],
            targets: []
        };
    },
    popoverJumpTo: function(){
        Actions.articleJumpTo(this.props.result, {
            id: '#' + this.props.target
        });
    },
    onJumpTo: function(result, jump){
        if(result !== this.props.result) return;
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
            var fudge = 4; //why fudge?  probably because scrolling on body
            //not $(window), as it can't animate
            var container = $('.tab-content, .results-container');
            container.animate({scrollTop: (target.offset().top - this.offset + fudge)}, jump.noscroll ? 0: 300);
        }
        else{
            return 'Not Found';
        }
    },
    componentWillUnmount: function(){
        var $parent =  $(this.getDOMNode()).parents('.tab-content, .results-container');
        $parent.off('scroll', this.debounce_scroll);
        if(this.isPartial()){
            $parent.off('scroll', this.debounce_visibility);
            $(window).off('resize', this.debounce.reset_heights);
        }
    },
    interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            if(link.attr('href') !== '#'){
                if(link.attr('data-link-id')){
                    var container = $('body'),
                        scrollTo = $('#'+link.attr('data-target-id'));
                    Actions.linkOpened(this.props.result,
                        {
                        type: 'link',
                        title: link.text(),
                        id: link.attr('data-link-id'),
                        target: link.attr('data-target-id'),
                        positionLeft: link.offset().left,
                        positionTop:link.offset().top,
                        fetch: true,
                        url: link.attr('href')
                    });
                }
            }
            else if(link.attr('data-def-id')){
               Actions.definitionOpened(this.props.result,
                    {
                    type: 'definition',
                    title: link.text(),
                    id: link.attr('data-def-idx'),
                    positionLeft: link.offset().left,
                    positionTop:link.offset().top,
                    fetch: true,
                    url: '/definition/'+this.props.result.content.id+'/'+link.attr('data-def-id')
                });
               console.log(link.attr('href'));
            }
        }
     }
});