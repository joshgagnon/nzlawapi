"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Modal = require('react-bootstrap/Modal');
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
var TypeAhead = require('./TypeAhead.jsx'); 
require('bootstrap3-typeahead');
require('bootstrap')

var ActDisplay = React.createClass({
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    componentDidUpdate: function(){
        var self = this;
        $(this.getDOMNode()).popover({
            container: '.act_browser', 
            placement: 'auto', 
            trigger: 'focus', 
            selector: '[data-toggle="popover"]',
            content: function(){
                return self.props.definitions[$(this).attr('def-id')].html;
            },
            title: function(){
                return self.props.definitions[$(this).attr('def-id')].title;
            }
        });
     },
     interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            if(link.attr('href') !== '#'){

            }
        }
     }
});

var ArticleScroll = React.createClass({
    componentDidMount: function(){
        $('.legislation-contents').affix({
          offset: {
            top: 0
          }
        })
    },
    componentDidUpdate: function(){
         $('body').scrollspy({ target:'.legislation-contents .contents', offset:90});
        $('body').on('activate.bs.scrollspy', function (e) {
            var scrollTo = $(e.target);
            var container = $('.legislation-contents');
            console.log(scrollTo.position(), container.position())
            container.scrollTop(scrollTo.offset().top -container.offset().top + container.scrollTop());
        }); 
     },
     interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            var offset = 58;
            var container = $('body'),
                scrollTo = $(link.attr('href'));
            container.scrollTop(scrollTo.offset().top - offset);
        }
     },
     stopPropagation: function(e){
        // TODO, fix
        e.stopPropagation();
     },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopProp} className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.html}}/>
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
                process(results.results)
            }.bind(this));
    },
    submit: function(e){
    	e.preventDefault();
    	var index = this.state.typeahead.indexOf(this.state.article_name);
    	this.fetch();
    },
    next: function(){
    	var idx = (this.state.index+1) % this.state.typeahead.length;
    	this.setState({index: idx, act_name: this.state.typeahead[idx]}, this.fetch);
    },
    prev: function(){
    	var idx = this.state.index-1
    	var n = this.state.acts_typeahead.length;
    	idx = ((idx%n)+n)%n;
    	this.setState({index: idx, act_name: this.state.typeahead[idx]}, this.fetch);
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
                    act_html: response.html_content, 
                    act_name: response.act_name,
    				contents: response.html_contents_page,
                    act_definitions: response.definitions,
                    loading: false
    			});
    		}.bind(this))
    },
    handleArticleChange: function(value){
        this.setState({article_name: value.name, article_type: value.type});
    },
	render: function(){
        var linkArticle = {
          value: this.state.article_name,
          requestChange: this.handleArticleChange
        };
		return (<div className="act_browser">
					<nav className="navbar navbar-default navbar-fixed-top">
						<div className="container">
							<form className="form form-inline">
								<TypeAhead typeahead={this.typeahead_query}  key="article_name" ref="article_name" name="article_name" 
                                        label='Article' valueLink={linkArticle} appendToSelf={true}
										buttonAfter={<Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>}/>
							 	<ButtonGroup>
								 	<Button onClick={this.prev}><span className="glyphicon glyphicon-chevron-left"></span></Button>
								 	<Button onClick={this.next}><span className="glyphicon glyphicon-chevron-right"></span></Button>
							 	</ButtonGroup>
							</form>
						</div>
					</nav>
					<div className="container">
                    {this.state.loading ? <div className="csspinner traditional"></div> : null}
						<div className="row results">
                            <div className="col-md-9">
								<ActDisplay html={this.state.act_html} definitions={this.state.act_definitions} />
                            </div>
                            <div className="col-md-3">
                                <ArticleScroll html={this.state.contents}/>
                            </div>                           
						</div>
					</div>
				</div>);
	}
});
