"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Col = require('react-bootstrap/Col');
var Glyphicon= require('react-bootstrap/Glyphicon');
var BootstrapMixin = require('react-bootstrap/BootstrapMixin');
var GraphModal = require('./GraphModal.jsx')
var ModalTrigger = require('react-bootstrap/ModalTrigger');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
var ArticleStore = require('../stores/ArticleStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');

var SearchResults = require('./SearchResults.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Popover = require('./Popover.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
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

$.fn.focusNextInputField = function() {
    return this.each(function() {
        var fields = $(this).parents('form:eq(0),body').find('button,input,textarea,select');
        var index = fields.index( this );

        if ( index > -1 && ( index + 1 ) < fields.length ) {
            fields.eq( index + 1 ).focus();
        }
        return false;
    });
};

var Article = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
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
    setup_scroll: function(){
        this.offset = 100;
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = $(window).scrollTop() + self.offset;
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
            var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id]').attr('id');
            Actions.articlePosition({pixel: $(window).scrollTop() + self.offset, repr: result, id: id});
        }, 0);

        $(window).on('scroll', this.debounce_scroll);
        if(this.isPartial()){
            this.debounce_visibility();
            $(window).on('scroll', this.debounce_visibility);
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
        if(this.isPartial()){
            return this.renderSkeleton();
        }
        else{
            return this.renderStandard();
        }
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
                {this.render_link_popovers()}
                {this.render_definition_popovers()}
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
                node = node.find('[data-location="'+jump.location[i]+'"]');
            }
            target = node;
        }
        else if(jump.id){
            target = $(this.getDOMNode()).find(jump.id);
        }
        if(target && target.length){
            var fudge = 4; //why fudge?  probably because scrolling on body
            //not $(window), as it can't animate
            var container = $('body, html');
            container.animate({scrollTop: (target.offset().top - this.offset + fudge)}, jump.noscroll ? 0: 300);
        }
        else{
            return 'Not Found';
        }
    },
    componentWillUnmount: function(){
        $(window).off('scroll', this.debounce_scroll);
        if(this.isPartial()){
            $(window).off('scroll', this.debounce_visibility);
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





module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(ResultStore, 'onResults'),
        React.addons.LinkedStateMixin
    ],
    getInitialState: function(){
        return {
            results: []
        };
    },
    onResults: function(data){
        var active_result, active;
        active_result = _.find(data.results, function(d){ return d.active}) || data.results[0];
        if(active_result){
            active = active_result.id;
        }
        this.setState({results: data.results, active: active, active_result: active_result});
    },
    submit: function(e){
    	e.preventDefault();
    	this.fetch();
    },
    fetch: function(){
        console.log(this.state)
        if(!this.state.search_query){
            return;
        }
        this.setState({
            loading: true
        });
        var query;
        var title;
        console.log(this.state.location)
        if(this.state.document_id){
            query = {
                type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                query: this.state.location,
                id: this.state.document_id
            };
            title = this.state.search_query
        }
        else{
            query = {
                type: 'search',
                query: this.state.article_name
            };
            title = 'Search: '+this.state.search_query
        }
        Actions.newResult({query: query, title: title});
    },
    handleArticleChange: function(value){
        var self = this;
        // ID means they clicked or hit enter, so focus on next
        this.setState({search_query: value.search_query, document_id: value.id, article_type: value.type}, function(){
            if(value.id){
                // hack!
                setTimeout(function(){
                    $(self.refs.autocomplete.getInputDOMNode()).focusNextInputField();
                }, 0);
            }
        });
    },
    handleLocation: function(e){
        e.stopPropagation();
        this.setState({location: e.target.value});
    },
    reset: function(){
        this.setState({
            article_type: null,
            search_query: null,
            location: null
        });
        Actions.clearResults();
    },
    handleTab: function(active){
        if(active !== this.state.active){
            Actions.activateResult(_.find(this.state.results, function(d){ return d.id === active}));
        }
    },
    closeTab: function(id){
        var result = _.find(this.state.results, function(d){ return d.id === id});
        Actions.removeResult(result);
    },
    renderResult: function(result){
        if(result.content){
            return result.query.type=='search' ?
                    <SearchResults key={result.id} result={result}  popupContainer='.act_browser' /> :
                    <Article key={result.id} result={result}  popupContainer='.act_browser' />
        }
        else{
            return <div className="search-results csspinner traditional"/>;
        }

    },
    renderBody: function(){
        var self = this;
        if(this.state.results.length > 1)
            return <TabbedArea activeKey={this.state.active} onSelect={this.handleTab} onClose={this.closeTab}>
                {   this.state.results.map(function(result){
                        return (
                             <TabPane key={result.id} eventKey={result.id} tab={result.title} >
                                { self.renderResult(result) }
                            </TabPane>
                          )
                      })
            }
            </TabbedArea>
        else if(this.state.results.length == 1){
            return  this.renderResult(this.state.results[0]);
        }
    },
	render: function(){
        var formClasses = "navbar-form navbar-left ";
        if(this.state.document_id){
            formClasses += 'showing-location';
        }
		return (<div className="act_browser">
                        <div className="container-fluid">

                         <nav className="navbar navbar-default navbar-fixed-top">

                            <div className="navbar-header">
                              <a className="navbar-brand hidden-xs" href="#">
                                   <img src="/build/images/logo-colourx2.png" alt="CataLex" className="logo img-responsive center-block"/>
                                 </a>
                            </div>
                                <form className={formClasses}>
								     <AutoComplete endpoint="/article_auto_complete" onUpdate={this.handleArticleChange} onSubmit={this.submit}
                                        search_value={{search_query: this.state.search_query, id: this.state.document_id, type: this.state.article_type }}
                                        appendToSelf={true} ref="autocomplete"
										buttonAfter={
                                            <div className="btn-group">
                                                <Button type="input" bsStyle="primary" onClick={this.submit} >Search</Button>
                                             <Button type="button" bsStyle="primary" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                              <span className="caret"></span>
                                              <span className="sr-only">Toggle Dropdown</span>
                                            </Button>
                                            <ul className="dropdown-menu" role="menu">
                                                <li><a href="#">Search All</a></li>
                                                <li><a href="#">Search Acts</a></li>
                                                <li><a href="#">Search Regulations</a></li>
                                                <li><a href="#">Search Cases</a></li>
                                                <li className="divider"></li>
                                                <li><a href="#">Advanced Search</a></li>
                                              </ul>
                                            </div>
                                    } >
                                    { this.state.document_id ? <Input type="text" className="location" placeholder="Location..." onChange={this.handleLocation}
                                        ref="location"  /> : <Input/> }
                                    </AutoComplete>

                                </form>
					       </nav>
                        </div>
                    <div className="sidebar-wrapper">
                        <a><Glyphicon glyph="search" /></a>
                        <a><Glyphicon glyph="floppy-open" /></a>
                        <a><Glyphicon glyph="floppy-save" /></a>
                        <a><Glyphicon glyph="print" /></a>
                        <a><Glyphicon glyph="star" /></a>
                        <ModalTrigger modal={<GraphModal />}>
                            <a><Glyphicon glyph="globe" /></a>
                        </ModalTrigger>
                        <a onClick={this.reset}><Glyphicon glyph="trash" /></a>
                    </div>
                    <div className="container-wrapper">
						<div className="results">
                            {this.renderBody() }
						</div>
					</div>
                    <div className="contents-bar-wrapper navbar-default visible-md-block visible-lg-block">
                        { this.state.active_result && this.state.active_result.content && this.state.active_result.query.type !== 'search' ?
                        <ArticleScrollSpy html={this.state.active_result.content.html_contents_page} result={this.state.active_result} />  : null
                        }
                    </div>
				</div>);
    }
});