"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Modal = require('react-bootstrap/Modal');
var OverlayMixin = require('react-bootstrap/OverlayMixin');
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




var DefModal = React.createClass({
  mixins: [OverlayMixin],
  getInitialState: function () {
    return {
      isModalOpen: false
    };
  },
  handleToggle: function () {
    this.setState({
      isModalOpen: !this.state.isModalOpen
    });
  },
  opened: function(){
    this.setState({
      isModalOpen: true
    });
    this.props.opened();
  },
  render: function () {
    return (
      <Button onClick={this.opened} bsSize="xsmall" className="show-more">Show More</Button>
    );
  },
  // This is called by the `OverlayMixin` when this component
  // is mounted or updated and the return value is appended to the body.
  renderOverlay: function () {
    if (!this.state.isModalOpen) {
      return <span/>;
    }
    return (
        <Modal {...this.props} title={"Definition: "+this.props.title}  onRequestHide={this.handleToggle}>
           <div className="modal-body">
            <div dangerouslySetInnerHTML={{__html:this.props.html}}/>
            </div>
          <div className="modal-footer">
            <Button onClick={this.handleToggle}>Close</Button>
          </div>
        </Modal>
      );
  }
});


var ActDisplay = React.createClass({
    render: function(){
        return <div onClick={this.interceptLink} className="legislation-result" dangerouslySetInnerHTML={{__html:this.props.html}} />
    },
    componentDidUpdate: function(){
        var self = this;
        $(this.getDOMNode()).popover({
            container: '.act_browser',
            placement: 'auto',
            trigger: 'click',
            selector: '[data-toggle="popover"]',
            template: '<div class="popover def-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title">'+
                '</h3><div class="popover-close">&times;</div><div class="popover-content"></div><div class="popover-footer">' +
                '</div></div>',
            content: function(){
                return self.props.definitions[$(this).attr('def-id')].html;
            },
            title: function(){
                return self.props.definitions[$(this).attr('def-id')].title;
            }
        }).on('show.bs.popover', function(e){
            //fucking hackjob
            var $target = $(e.target);
            var data = self.props.definitions[$target.attr('def-id')];
            var opened = function(){
                $target.popover('hide');
            }
            var closed= function(){
                //React.unmountComponentAtNode($target.data('bs.popover').$tip.find('.popover-footer')[0]);
            }
            var button = <DefModal title={data.title} html={data.html} opened={opened} onRequestHide={closed}/>;
            React.render(button,
                $target.data('bs.popover').$tip.find('.popover-footer')[0]);

        }).on('shown.bs.popover', function(e){
            var $target = $(e.target);
            $target.data('bs.popover').$tip
                .on('click', '.popover-close', function(){
                    $target.popover('hide')
                })
                .on('click', '.show-more', function(){
                });
        });
     },
     //todo destroy
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
								<TypeAhead typeahead={this.typeahead_debounce}  key="article_name" ref="article_name" name="article_name"
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
                            <div className="col-md-10">
								<ActDisplay html={this.state.act_html} definitions={this.state.act_definitions} />
                            </div>
                            <div className="col-md-2">
                                <ArticleScroll html={this.state.contents}/>
                            </div>
						</div>
					</div>
				</div>);
	}
});
