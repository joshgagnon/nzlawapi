"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Col = require('react-bootstrap/Col');

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
        this.refresh();
    },
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    refresh: function(){
        //TODO, check if height has changed
        var self = this;
        var offsetBase   = $(this.props.scollEl).scrollTop()
        this.offsets = []
        this.targets = []
        //this.scrollHeight = $(this.getDOMNode()).getScrollHeight()
        var self = this

        $(self.getDOMNode())
            .find('[data-location]')
            .map(function() {
                var $el = $(this)
                return ( $el.is(':visible') && [
                    [$el['position']().top + offsetBase, this]
                ]) || null
            })
            .sort(function(a, b) {
                return a[0] - b[0]
            })
            .each(function() {
                    self.offsets.push(this[0])
                    self.targets.push(this[1])
                });
        console.log(self.offsets)
        var find_current = function(){
            var top = $('body').scrollTop() + 58;
            var i = _.sortedIndex(self.offsets, top);
            console.log($(self.targets[i]))
            return self.targets[i];
        };
        $(window).on('scroll', _.debounce(function(){
            var $el = $(find_current());
            var result =  $el.parents('[data-location]').map(function(){
                return $(this).attr('data-location');
            }).toArray().reverse().join('') + $el.attr('data-location');
            console.log(result)
            self.props.updatePosition({value: result});
        }, 200));
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
/*
var JumpTo = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin
    ],
    getInitialState: function() {

        return {jump_to: null}
    },
    componentDidUpdate: function(oldProps){
        if(oldProps.html!==this.props.html){
            this.refresh();
        }
    },

    render: function(){
        return <Input ref="jump_to" name="jump_to" type="text" valueLink={this.linkState('jump_to')}
        buttonAfter={<Button type="submit" className="submit" bsStyle="info" onClick={this.submit}>Jump To</Button>}/>
    }
});
*/

var ArticleScroll = React.createClass({
    componentDidMount: function(){
        $('.legislation-contents').affix({
          offset: {
            top: 0
          }
        })
         $('body').scrollspy({ target:'.legislation-contents .contents', offset:90});
        $('body').on('activate.bs.scrollspy', function (e) {
            var scrollTo = $(e.target);
            var container = $('.legislation-contents');
            container.scrollTop(scrollTo.offset().top -container.offset().top + container.scrollTop());
        });
    },
    componentWillUnmount: function(){
         $('body').scrollspy('destroy').off('activate.bs.scrollspy');
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
        //_.debounce
        $.get('/act_case_hint.json', {query: query})
            .then(function(results){
                this.setState({typeahead: results.results});
                process(results.results);
            }.bind(this));
    },
    submit: function(e){
    	e.preventDefault();
    	var index = this.state.typeahead.indexOf(this.state.article_name);
    	this.fetch();
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
    handlePositionChange: function(value){
        this.setState({article_location: value.value})
    },
    handleJumpToChange: function(value){
        //this.setState({article_location: value.value})
    },
	render: function(){
        var linkArticle = {
          value: this.state.article_name,
          requestChange: this.handleArticleChange
        };
		return (<div className="act_browser">
					<nav className="navbar navbar-default navbar-fixed-top">
						<div className="container">
							<form className="form ">
                            <Col lg={6}>
								<TypeAhead typeahead={this.typeahead_debounce}  key="article_name" ref="article_name" name="article_name"
                                        valueLink={linkArticle} appendToSelf={true}
										buttonAfter={<Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>} />
                                </Col>
                               <Col lg={6} >
                                <Input ref="jump_to" name="jump_to" type="text" value={this.state.article_location} onChange={ this.handleJumpToChange}
                                        buttonAfter={<Button type="submit" className="submit" bsStyle="info" onClick={this.submit}>Jump To</Button>}/>
                                </Col>
							</form>
						</div>
					</nav>
					<div className="container">
                    {this.state.loading ? <div className="csspinner traditional"></div> : null}
						<div className="row results">
                            <div className="col-md-10">
								{this.state.act_name ? <ActDisplay html={this.state.act_html} defContainer={'.act_browser'} definitions={this.state.act_definitions} updatePosition={this.handlePositionChange}/> : null}
                            </div>
                            <div className="col-md-2">
                                <ArticleScroll html={this.state.contents}/>
                            </div>
						</div>
					</div>
				</div>);
	}
});
