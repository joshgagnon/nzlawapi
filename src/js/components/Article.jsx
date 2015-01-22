"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Col = require('react-bootstrap/Col');
var Glyphicon= require('react-bootstrap/Glyphicon');
var TabbedArea = require('react-bootstrap/TabbedArea');
var TabPane = require('react-bootstrap/TabPane');

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

var ActDisplay = React.createClass({
    mixins: [
        Definitions.DefMixin,
        Reflux.listenTo(ArticleJumpStore,"onJumpTo")
    ],
    componentDidMount: function(){
        this.offset = 56;
        var self = this;
        this.refresh();
        var find_current = function(){
            var top = $(window).scrollTop() + self.offset;
            var i = _.sortedIndex(self.offsets, top) -1;
            return self.targets[Math.min(Math.max(0, i), self.targets.length -1)];

        };
        this.debounce_scroll = _.debounce(function(){
            var result = ''
            if(self.scrollHeight !== $(self.getDOMNode()).height()){
                self.refresh();
            }
            var $el = $(find_current());
            if(!$el.attr('data-location-no-path')){
                result =  $el.parents('[data-location]').not('[data-location-no-path]').map(function(){
                    return $(this).attr('data-location');
                }).toArray().reverse().join('');
            }
            result += $el.attr('data-location');
            var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id]').attr('id');
            Actions.articlePosition({pixel: $(window).scrollTop() + self.offset, repr: result, id: id});
        }, 0);
        $(window).on('scroll', this.debounce_scroll);
    },
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    refresh: function(){
        var self = this;
        var pos = 'offset';
        this.offsets = []
        this.targets = []
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
                    self.offsets.push(this[0])
                    self.targets.push(this[1])
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
            container.animate({scrollTop: (target.offset().top - this.offset + fudge)});
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
                if(link.attr('data-linkid')){
                    var container = $('body'),
                        scrollTo = $('#'+link.attr('data-linkid'));
                    container.animate({scrollTop: (scrollTo.offset().top - self.offset)});
                }
            }
        }
     }
});


var ArticleScroll = React.createClass({
    mixins: [
      Reflux.listenTo(ArticleStore,"onPositionChange")
    ],

    onPositionChange: function(value){
        var self = this;
        var $el = $(this.getDOMNode());
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
            Actions.articleJumpTo({id: link.attr('href')});
        }
    },
    stopPropagation: function(e){
        e.stopPropagation();
        var elem = $(this.getDOMNode());
         if(e.deltaY<0 && elem.scrollTop() == 0) {
                 e.preventDefault();
           }
         if(e.deltaY>0 && elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
                 e.preventDefault();
           }

    },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopPropagation} className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.html}}/>
    }
});

module.exports = React.createClass({
	mixins: [
      Reflux.listenTo(ArticleStore,"onPositionChange")
    ],
    load: function(){
        // for development only, delete
        var article = {article_name: 'Companies Act 1993', article_type: 'act'}
        if(localStorage['article']){
            article = JSON.parse(localStorage['article']);
        }
        //perhaps wrong place?
        this.typeahead_debounce = _.debounce(this.typeahead_query, 300);
    	return {
    		typeahead: [],
            article_name: this.props.article_name || article.article_name,
    		article_type: this.props.article_type || article.article_type,
    	}
    },
    getInitialState: function(){
        return {};
    },
    componentDidMount: function(){
        this.setState(this.load(), this.fetch)
    },
    typeahead_query: function(query, process){
        $.get('/act_case_hint.json', {query: query})
            .then(function(results){
                this.setState({typeahead: results.results});
                process(results.results);
            }.bind(this));
    },
    submit: function(e){
    	e.preventDefault();
    	this.fetch();
    },
    jumpTo: function(e){
        e.preventDefault();
        var loc = this.state.article_location;
        if(loc){
            var m = _.filter(loc.split(/[,()]/)).map(function(s){
                s = s.trim();
                if(s.indexOf('cl') === 0){
                    s = ', '+s;
                }
                else if(s.indexOf(' ') === -1 && s.indexOf('[') === -1){
                    s = '('+s+')';
                }
                return s;
            });
            Actions.articleJumpTo({location: m});
        }
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
    	$.get('/query', {
    		type: this.state.article_type,
            find: 'full',
    		title: this.state.article_name
    	})
    		.then(function(response){
    			this.setState({
                    html: response.html_content,
                    name: response.act_name || response.full_citation,
    				contents: response.html_contents_page,
                    definitions: response.definitions,
                    article_type: response.type,
                    loading: false
    			});
    		}.bind(this));
    },
    handleArticleChange: function(value){
        if(typeof(value) == 'string'){
                this.setState({article_name: value})
        }
        else{
            this.setState({article_name: value.name, article_type: value.type});
        }
    },
    onPositionChange: function(value){
        this.setState({article_location: value.repr});

    },
    handleJumpToChange: function(e){
        this.setState({article_location: e.target.value})
    },
    reset: function(){
        this.setState({
            html: null,
            name: null,
            contents: null,
            definitions: null,
            article_type: null,
            loading: false,
            article_name: null
        });
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
								    <TypeAhead typeahead={this.typeahead_debounce}  key="article_name" ref="article_name" name="article_name"
                                        valueLink={linkArticle} appendToSelf={true}
										buttonAfter={<Button type="input" bsStyle="primary" onClick={this.submit}>Search</Button>} />
                                    <Input ref="jump_to" name="jump_to" type="text"
                                        bsStyle={this.state.jumpToError ? 'error': null} hasFeedback={!!this.state.jumpToError}
                                        value={this.state.article_location} onChange={ this.handleJumpToChange}
                                        buttonAfter={<Button type="input" bsStyle="info" onClick={this.jumpTo}>Jump To</Button>} />
                                </form>
					       </nav>
                        </div>
                    <div className="sidebar-wrapper">
                        <a><Glyphicon glyph="search" /></a>
                        <a><Glyphicon glyph="floppy-open" /></a>
                        <a><Glyphicon glyph="floppy-save" /></a>
                        <a><Glyphicon glyph="print" /></a>
                        <a><Glyphicon glyph="star" /></a>
                        <a onClick={this.reset}><Glyphicon glyph="trash" /></a>
                    </div>
                    <div className="container-wrapper">
    					<div className="container-fluid">
                        {this.state.loading ? <div className="csspinner traditional"></div> : null}
    						<div className="results">


                                    {this.state.name ? <ActDisplay html={this.state.html} article_type={this.state.article_type} defContainer={'.act_browser'} scrollEl={'body'}
                                    definitions={this.state.definitions} updatePosition={this.handlePositionChange} ref="article" /> : null}



    						</div>
                        </div>
					</div>
                    <div className="contents-bar-wrapper navbar-default visible-md-block visible-lg-block">
                        <ArticleScroll html={this.state.contents}/>
                    </div>
				</div>);
	}
});

