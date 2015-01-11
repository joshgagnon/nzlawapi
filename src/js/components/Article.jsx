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

var ActScroll = React.createClass({
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
        e.stopPropagation();
     },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopProp} className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.html}}/>
    }
});

module.exports = React.createClass({
	mixins: [
        React.addons.LinkedStateMixin,
    ],
    getInitialState: function(){
    	return {
    		acts_typeahead: [],
    		act_name: 'Companies Act 1993',
    		index: 0,
    	}
    },
    componentDidMount: function(){
        this.fetch();
    },
    typeahead_query: function(query, process){
        $.get('/act_case_hint.json', {query: query})
            .then(function(results){
                process(results.results)
            });
    },
    submit: function(e){
    	e.preventDefault();
    	var index = this.state.acts_typeahead.indexOf(this.state.act_name);
    	this.fetch();
    },
    next: function(){
    	var idx = (this.state.index+1) % this.state.acts_typeahead.length;
    	this.setState({index: idx, act_name: this.state.acts_typeahead[idx]}, this.fetch);
    },
    prev: function(){
    	var idx = this.state.index-1
    	var n = this.state.acts_typeahead.length;
    	idx = ((idx%n)+n)%n;
    	this.setState({index: idx, act_name: this.state.acts_typeahead[idx]}, this.fetch);
    },    
    fetch: function(){
    	$.get('/query', {
    		type: 'act',
            act_find: 'full',
    		act_name: this.state.act_name
    	})
    		.then(function(response){
    			this.setState({
                    act_html: response.html_content, 
                    act_name: response.act_name,
    				act_contents: response.html_contents_page,
                    act_definitions: response.definitions
    			});
    		}.bind(this))
    },	        	
	render: function(){
		return (<div className="act_browser">
					<nav className="navbar navbar-default navbar-fixed-top">
						<div className="container">
							<form className="form form-inline">
								<TypeAhead typeahead={this.typeahead_query}  key="act_name" ref="act_name" name="act_name" label='Act' valueLink={this.linkState('act_name')} 
										buttonAfter={<Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>}/>
							 	<ButtonGroup>
								 	<Button onClick={this.prev}><span className="glyphicon glyphicon-chevron-left"></span></Button>
								 	<Button onClick={this.next}><span className="glyphicon glyphicon-chevron-right"></span></Button>
							 	</ButtonGroup>
							</form>
						</div>
					</nav>
					<div className="container">	
						<div className="row results">
                            <div className="col-md-9">
								<ActDisplay html={this.state.act_html} definitions={this.state.act_definitions} />
                            </div>
                            <div className="col-md-3">
                                <ActScroll html={this.state.act_contents}/>
                            </div>                           
						</div>
					</div>
				</div>);
	}
});
