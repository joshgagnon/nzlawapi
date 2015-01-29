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
var Definitions = require('./Definitions.jsx');
var TypeAhead = require('./TypeAhead.jsx');
var SearchResults = require('./SearchResults.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var JumpTo= require('./JumpTo.jsx');
require('bootstrap3-typeahead');
require('bootstrap');


var ArticleJumpStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
    },
    onArticleJumpTo: function(state){
        this.trigger(state);
    }
});

var OpenLinksStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.openLinks = [];
    },
    onLinkOpened: function(link){
        this.openLinks.push(link);
        this.trigger(this.openLinks);
    },
    onLinkClosed: function(link){
        this.openLinks = _.reject(this.openLinks, function(l){ return l.id === link.id});
        this.trigger(this.openLinks);
    }
});

var PositionedPop = React.createClass({
        mixins: [BootstrapMixin],
        getInitialState: function () {
            return {
              placement: 'bottom'
            };
        },
       componentDidMount: function(){
        var self = this;
        var $el = $(this.getDOMNode());
        var $target = $('[data-link-id='+this.props.id+']');
        //TODO use bootstrap layout algorithm
        $el.css({'left': '-='+$el.outerWidth()/2})
        //jQuery.fn.tooltip.Constructor.prototype.show.call(obj);
       },
      close: function(){
        Actions.linkClosed(this.props)
      },
      scrollTo: function(){
        Actions.articleJumpTo({id: '#'+this.props.target});
        Actions.linkClosed(this.props)
      },
      render: function () {
        var classes = 'popover def-popover '+this.state.placement;
        var style = {};
        style['left'] = this.props.positionLeft;
        style['top'] = this.props.positionTop+16;
        style['display'] = 'block';

        var arrowStyle = {};
        arrowStyle['left'] = this.props.arrowOffsetLeft;
        arrowStyle['top'] = this.props.arrowOffsetTop;

        var html;
        if(this.props.target){
            html = $('#'+this.props.target)[0].outerHTML;
        }
        else{
            html = ''
        }
        return (
            <div className={classes} role="tooltip" style={style}>
                <div className="arrow"  style={arrowStyle}></div>
                <h3 className="popover-title">{this.props.title}</h3>
                <div className="popover-close" onClick={this.close}>&times;</div>
                <div className="popover-content">
                    <div className='legislation' dangerouslySetInnerHTML={{__html: html}} />
                </div>
                <div className="popover-footer">
                <div className="row">

                <Col md={6}>
                    <Button onClick={this.scrollTo}>Scroll To</Button >
                    </Col>
                <Col md={6}>
                <Button  onClick={this.open}>Open</Button >
                </Col>
                </div>
                </div>
            </div>
        );
      }

});


var Article = React.createClass({
    mixins: [
        Definitions.DefMixin,
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        Reflux.listenTo(ResultStore, "onResultUpdate"),
    ],
    propTypes: {
        result: React.PropTypes.object.isRequired,
    },
    get_definition: function(id){
        return this.props.result.content.definitions[id];
    },
    componentDidMount: function(){
        this.mounted = true;
        this.setup_scroll();
        this.calculate_parts();
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


            var top = $(window).scrollTop() + self.offset;
            var i = Math.max(_.sortedIndex(self.hooks.offsets, top) -1, 0);
            var $hook = $(self.hooks.targets[i]);
            var hook_num = $hook.attr('cata-hook');
            if(!$hook.hasClass('loaded') && !_.contains(self.props.result.requested_parts, hook_num)){
                Actions.getMoreResult(self.props.result, {requested_parts: [hook_num]});
            }

        }, 0);
        $(window).on('scroll', this.debounce_scroll);
    },
    calculate_height: function(count, width){
        return Math.max(count/width * 50 -450, 300);
    },
    calculate_parts: function(){
        var self = this;
        var $el = $(this.getDOMNode());
        var $nodes  = $el.find('[cata-hook][cata-hook!=""]');
        $nodes.each(function(){
            var $this = $(this);
            $(this).height(self.calculate_height(parseInt($this.attr('cata-hook-length'), 10),$el.width()));
        })

    },
    onResultUpdate: function(results){
        if(this.isMounted() && this.props.result.active && !_.isEmpty(this.props.result.new_parts)){
            var $el = $(this.getDOMNode());
            var parts = this.props.result.new_parts;
            // super naughty wtf fix this
            this.props.result.new_parts = {};

            _.map(parts, function(v , k){
                var $hook = $el.find('[cata-hook='+k+']');
                var $new_hook = $(v).addClass('loaded');
                $hook.replaceWith($new_hook);

            })
        }
    },
    render: function(){
        var links = (this.props.result.open_links || []).map(function(link){
                        return (<PositionedPop placement="auto" {...link} key={link.id}/>)
                    });
        return <div className="legislation-result" >
                <div onClick={this.interceptLink} dangerouslySetInnerHTML={{__html:this.props.result.content.html_content}} />
                {links}
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
            .each(function() {
                    self.locations.offsets.push(this[0])
                    self.locations.targets.push(this[1])
                });
        this.hooks = {
            offsets: [],
            targets: []
        };
        $(self.getDOMNode())
            .find('[cata-hook][cata-hook!=""]')
            .map(function() {
                var $el = $(this);
                return ( $el.is(':visible') && [
                    [$el[pos]().top, this]
                ]) || null
            })
            .each(function() {
                    self.hooks.offsets.push(this[0])
                    self.hooks.targets.push(this[1])
                });
    },
    onJumpTo: function(jump){
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
    },
     interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            if(link.attr('href') !== '#'){
                if(link.attr('data-link-id')){
                    var container = $('body'),
                        scrollTo = $('#'+link.attr('data-target-id'));
                   // container.animate({scrollTop: (scrollTo.offset().top - self.offset)});
                   Actions.linkOpened({
                        title: link.text(),
                        id: link.attr('data-link-id'),
                        target: link.attr('data-target-id'),
                        positionLeft: link.offset().left,
                        positionTop:link.offset().top
                    });
                }
            }
        }
     }
});


var ArticleScrollSpy = React.createClass({
    mixins: [
      Reflux.listenTo(ArticleStore,"onPositionChange")
    ],

    onPositionChange: function(value){
        var self = this;
        var $el = $('.legislation-contents', this.getDOMNode());
        $el.find('.active').each(function(){
            $(this).removeClass('active');
        });
        this.active = [];
        var active = $el.find('[href=#'+value.id+']').parent();
        if(active.length){
            active.addClass('active');
            active.parentsUntil( '.contents', 'li').each(function(){
                $(this).addClass('active');
            });
            $el.scrollTop(active.offset().top -$el.offset().top - $el.height()/2 + $el.scrollTop());
        }

    },
    interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            Actions.articleJumpTo({id: link.attr('href'), noscroll: true});
        }
    },
    stopPropagation: function(e){
        e.stopPropagation();
        var elem = $(this.getDOMNode()).find('.legislation-contents');
         if(e.deltaY<0 && elem.scrollTop() == 0) {
                 e.preventDefault();
           }
         if(e.deltaY>0 && elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
                 e.preventDefault();
           }

    },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopPropagation} >
                <JumpTo />
                <div className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.html}}/>
            </div>
    }
});


module.exports = React.createClass({
    mixins: [
     // Reflux.listenTo(OpenLinksStore,"onLinkOpened")
        Reflux.listenTo(ResultStore, 'onResults'),
    ],
    load: function(){
        // for development only, delete
        var article = {article_name: 'Companies Act 1993', article_type: 'act'}
        if(localStorage['article']){
            article = JSON.parse(localStorage['article']);
        }
        //perhaps wrong place?
    	return {
    		typeahead: [],
            article_name: this.props.article_name || article.article_name,
    		article_type: this.props.article_type || article.article_type,
    	}
    },
    getInitialState: function(){
        return {
            //open_links: [],
            results: [],
            active: null
        };
    },
    componentDidMount: function(){
        this.typeahead_debounce = _.debounce(this.typeahead_query, 300);
        //this.setState(this.load(), this.fetch)
    },
    typeahead_query: function(query, process){
        $.get('/article_auto_complete', {query: query})
            .then(function(results){
                this.setState({typeahead: results.results});
                process(results.results);
            }.bind(this));
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
        // for development only, delete
        localStorage['article'] = JSON.stringify({article_name: this.state.article_name, article_type: this.state.article_type});
        if(!this.state.article_name){
            return;
        }
        this.setState({
            loading: true
        });
        var query;
        var title;
        if(this.state.article_type){
            query = {
                type: this.state.article_type,
                find: 'full',
                title: this.state.article_name
            };
            title = this.state.article_name
        }
        else{
            query = {
                type: 'search',
                query: this.state.article_name
            };
            title = 'Search: '+this.state.article_name
        }
        Actions.newResult({query: query, title: title});
    },
    handleArticleChange: function(value){
        if(typeof(value) == 'string'){
                this.setState({article_name: value, article_type: null})
        }
        else{
            this.setState({article_name: value.name, article_type: value.type});
        }
    },
    reset: function(){
        this.setState({
            //todo, resutls = [] in action
            article_type: null,
            article_name: null
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
	render: function(){
        var linkArticle = {
          value: this.state.article_name,
          requestChange: this.handleArticleChange
        };
		return (<div className="act_browser">
                        <div className="container-fluid">

                         <nav className="navbar navbar-default navbar-fixed-top">

                            <div className="navbar-header">
                              <a className="navbar-brand" href="#">
                                   <img src="/build/images/logo-colourx2.png" alt="CataLex" className="logo img-responsive center-block"/>
                                 </a>
                            </div>
                                <form className="navbar-form navbar-left ">
								    <TypeAhead typeahead={this.typeahead_debounce}  className='article_name' key="article_name" ref="article_name" name="article_name"
                                        valueLink={linkArticle} appendToSelf={true}
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
                                    } />
                                    <AutoComplete endpoint="/article_auto_complete" onChoose={this.handleArticleChange} onSearch={this.handleArticleChange} />
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
                            <TabbedArea activeKey={this.state.active} onSelect={this.handleTab} onClose={this.closeTab}>
                                {   this.state.results.map(function(result){
                                        var el;
                                        if(result.content){
                                            el = result.query.type=='search' ?
                                                    <SearchResults key={result.id} result={result}  popupContainer='.act_browser' /> :
                                                    <Article key={result.id} result={result}  popupContainer='.act_browser' />
                                        }
                                        else{
                                            el = <div className="search-results csspinner traditional"/>
                                        }
                                        return (
                                             <TabPane key={result.id} eventKey={result.id} tab={result.title} >
                                                { el }
                                            </TabPane>
                                          )
                                      })
                            }
                            </TabbedArea>
						</div>
					</div>
                    <div className="contents-bar-wrapper navbar-default visible-md-block visible-lg-block">
                        { this.state.active_result && this.state.active_result.content && this.state.active_result.query.type !== 'search' ?
                        <ArticleScrollSpy html={this.state.active_result.content.html_contents_page} />  : null
                        }
                    </div>
				</div>);
    }
});