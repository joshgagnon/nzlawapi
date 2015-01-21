"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Col = require('react-bootstrap/Col');
var Glyphicon= require('react-bootstrap/Glyphicon');

var ModalTrigger = require('react-bootstrap/ModalTrigger');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Definitions = require('./Definitions.jsx');
var TypeAhead = require('./TypeAhead.jsx');
require('bootstrap3-typeahead');
require('bootstrap')



var ActDisplay = React.createClass({
    mixins: [Definitions.DefMixin],
    componentDidMount: function(){
        var self = this;
        this.refresh();
        var find_current = function(){
            var offset = 30
            var top = $(window).scrollTop() - offset;
            console.log(top)
            var i = _.sortedIndex(self.offsets, top);
            return self.targets[(i>=self.targets.length ? self.targets.length-1 : i)];
        };
        $(window).on('scroll', _.debounce(function(){
            var result = ''
            if(self.scrollHeight !== $(self.getDOMNode()).height()){
                self.refresh();
            }
            var $el = $(find_current());
            if(!$el.attr('data-location-no-path')){
                result =  $el.parents('[data-location]').map(function(){
                    return $(this).attr('data-location');
                }).toArray().reverse().join('');
            }
            result += $el.attr('data-location');
            self.props.updatePosition({value: result});
        }, 200));
    },
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    refresh: function(){
        var self = this;
        var pos = this.props.article_type === 'case' ? 'offset' : 'position';
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
    jumpTo: function(location){
        var node = $(this.getDOMNode());
        for(var i=0;i<location.length;i++){
            node = node.find('[data-location="'+location[i]+'"]');
        }
        var offset = 58;
        var container = $("html, body");
        if(node.length){
            container.animate({scrollTop: (node.offset().top - offset)});
        }
        else{
            return 'Not Found';
        }
    },
     //todo destroy
     interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            if(link.attr('href') !== '#'){
                if(link.attr('data-linkid')){
                    var offset = 58;
                    var container = $('body'),
                        scrollTo = $('#'+link.attr('data-linkid'));
                    container.animate({scrollTop: (scrollTo.offset().top - offset)});
                }
            }
        }
     }
});


var ArticleScroll = React.createClass({
    componentDidMount: function(){
        var self = this;
         $('body').scrollspy({ target:'.legislation-contents .contents', offset:90});
        $('body').on('activate.bs.scrollspy', _.debounce(function (e) {
                var container = $(self.getDOMNode());
                var scrollTo = container.find('.active:last');
                if(!scrollTo.length){
                    scrollTo = container.find('a:first')
                }
                container.scrollTop(scrollTo.offset().top -container.offset().top -container.height()/2 + container.scrollTop());
        }, 100));
    },
    componentWillUnmount: function(){
         $('body').scrollspy('destroy').off('activate.bs.scrollspy');
    },
     interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            var offset = 58;
            var container = $(window),
                scrollTo = $(link.attr('href'));
            container.scrollTop(scrollTo.offset().top - offset);
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
      //  React.addons.LinkedStateMixin,
    ],
    getInitialState: function(){
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
    		index: 0,
    	}
    },
    componentDidMount: function(){
        if(this.state.article_name){
            this.fetch();
        }
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
            if(this.refs.article){
                var error= this.refs.article.jumpTo(m);
                if(error){
                    this.setState({jumpToError: error})
                }
            }
        }
        else{
            this.setState({jumpToError: 'Empty'})
        }
    },
    fetch: function(){
        // for development only, delete
        localStorage['article'] = JSON.stringify({article_name: this.state.article_name, article_type: this.state.article_type});
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
    		}.bind(this))
    },
    handleArticleChange: function(value){
        if(typeof(value) == 'string'){
                this.setState({article_name: value})
        }
        else{
            this.setState({article_name: value.name, article_type: value.type});
        }
    },
    handlePositionChange: function(value){
        this.setState({article_location: value.value, jumpToError: null});

    },
    handleJumpToChange: function(e){
        this.setState({article_location: e.target.value})
    },
	render: function(){
        var linkArticle = {
          value: this.state.article_name,
          requestChange: this.handleArticleChange
        };
		return (<div className="act_browser">
					<nav className="navbar navbar-default navbar-fixed-top">
						<div className="container">

                            <Col md={6}>
                                <form className="form ">
								    <TypeAhead typeahead={this.typeahead_debounce}  key="article_name" ref="article_name" name="article_name"
                                        valueLink={linkArticle} appendToSelf={true}
										buttonAfter={<Button type="input" bsStyle="primary" onClick={this.submit}>Search</Button>} />
                                </form>
                            </Col>
                            <Col md={6} >
                                <form className="form jump-to">
                                    <Input ref="jump_to" name="jump_to" type="text"
                                        bsStyle={this.state.jumpToError ? 'error': null} hasFeedback={!!this.state.jumpToError}
                                        value={this.state.article_location} onChange={ this.handleJumpToChange}
                                        buttonAfter={<Button type="input" bsStyle="info" onClick={this.jumpTo}>Jump To</Button>} />
                                </form>
                            </Col>
						</div>
					</nav>
                    <div className="sidebar-wrapper">
                        <a><Glyphicon glyph="search" /></a>
                        <a><Glyphicon glyph="floppy-open" /></a>
                        <a><Glyphicon glyph="floppy-save" /></a>
                        <a><Glyphicon glyph="print" /></a>
                        <a><Glyphicon glyph="star" /></a>
                        <a><Glyphicon glyph="trash" /></a>
                    </div>
                    <div className="container-wrapper">
    					<div className="container-fluid">
                        {this.state.loading ? <div className="csspinner traditional"></div> : null}
    						<div className="row results">
                                <Col md={12}>
    								{this.state.name ? <ActDisplay html={this.state.html} article_type={this.state.article_type} defContainer={'.act_browser'} scrollEl={'body'}
                                    definitions={this.state.definitions} updatePosition={this.handlePositionChange} ref="article" /> : null}
                                </Col>
    						</div>
                        </div>
					</div>
                    <div className="contents-bar-wrapper navbar-default visible-md-block visible-lg-block">
                        <ArticleScroll html={this.state.contents}/>
                    </div>
				</div>);
	}
});

