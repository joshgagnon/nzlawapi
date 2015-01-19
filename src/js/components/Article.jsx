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
        var self = this;
        this.refresh();
        var find_current = function(){
            var offset = 30
            var top = $('body').scrollTop() - offset;
            var i = _.sortedIndex(self.offsets, top);
            return self.targets[i];
        };
        $(window).on('scroll', _.debounce(function(){
            // if height changed, refresh
            var $el = $(find_current());
            var result =  $el.parents('[data-location]').map(function(){
                return $(this).attr('data-location');
            }).toArray().reverse().join('') + $el.attr('data-location');
            self.props.updatePosition({value: result});
        }, 200));
    },
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    refresh: function(){
        var self = this;
        this.offsets = []
        this.targets = []
        //this.scrollHeight = $(this.getDOMNode()).getScrollHeight()
        $(self.getDOMNode())
            .find('[data-location]')
            .map(function() {
                var $el = $(this)
                return ( $el.is(':visible') && [
                    [$el['position']().top, this]
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
        var container = $('body');
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
    jumpTo: function(e){
        e.preventDefault();
        var loc = this.state.article_location;
        var m = _.filter(loc.split(/[,()]/)).map(function(s){
            s = s.trim();
            if(s.indexOf('cl') === 0){
                s = ', '+s;
            }
            if(s.indexOf(' ') === -1){
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
							<form className="form ">
                            <Col lg={6}>
								<TypeAhead typeahead={this.typeahead_debounce}  key="article_name" ref="article_name" name="article_name"
                                        valueLink={linkArticle} appendToSelf={true}
										buttonAfter={<Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>} />
                                </Col>
                               <Col lg={6} className="jump-to-col" >
                                <Input ref="jump_to" name="jump_to" type="text"
                                    bsStyle={this.state.jumpToError ? 'error': null} hasFeedback={!!this.state.jumpToError}
                                    value={this.state.article_location} onChange={ this.handleJumpToChange}
                                    buttonAfter={<Button type="submit" className="submit" bsStyle="info" onClick={this.jumpTo}>Jump To</Button>}/>
                                </Col>
							</form>
						</div>
					</nav>
					<div className="container">
                    {this.state.loading ? <div className="csspinner traditional"></div> : null}
						<div className="row results">
                            <div className="col-md-10">
								{this.state.act_name ? <ActDisplay html={this.state.act_html} defContainer={'.act_browser'}
                                definitions={this.state.act_definitions} updatePosition={this.handlePositionChange} ref="article" /> : null}
                            </div>
                            <div className="col-md-2">
                                <ArticleScroll html={this.state.contents}/>
                            </div>
						</div>
					</div>
				</div>);
	}
});
