"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');


var SearchResult = React.createClass({
    getTitle: function(){
        return (this.props.data.getIn(['fields','title', 0]) || this.props.data.getIn(['fields','full_citation', 0])) || 'Unknown'
    },
    handleLinkClick: function(e){
        e.preventDefault();
        var query = {find: 'full', doc_type: this.props.data.getIn(['_type']), id: this.props.data.getIn(['fields','id', 0])};
        Actions.newPage({query: query, title: this.getTitle()}, this.props.viewer_id);
    },
    render: function(){
        var html = '',
            id = this.props.data.getIn(['fields', 'id', 0]);
        if( this.props.data.getIn(['highlight'])){
            html = this.props.data.getIn(['highlight','document']).join('');
        }
        return <div className="search-result">
                <h4><a href={"/open_article/"+this.props.data.get('_type')+'/'+id} onClick={this.handleLinkClick}>{ this.getTitle() }</a></h4>
                <div dangerouslySetInnerHTML={{__html: html}}/>
            </div>
    }
});

module.exports = React.createClass({
    componentDidMount: function(){
        var self = this;
        var offset = 100; //calculate
        var threshold = 500;
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var $scroll = $(self.getScrollContainer());
                if(self.isMounted() && !self.props.page.get('finished') &&
                    !self.props.page.get('fetching') &&
                    $scroll .scrollTop() + offset +$scroll .height() > $(self.getDOMNode()).height() - threshold){
                    Actions.getMorePage(self.props.page.get('id'));
                }
            }
        }, 100);
        $(this.getScrollContainer()).on('scroll', this.debounce_scroll);
        this.fetch();
    },
    fetch: function(){
       if(this.props.page.get('query') && !this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
        }
    },
    componentDidUpdate: function(){
        this.fetch();
    },
    componentWillUnmount: function(){
        $(this.getScrollContainer()).off('scroll', this.debounce_scroll);
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container')
    },
    shouldComponentUpdate: function(newProps){
        return this.props.page.get('content') !== newProps.page.get('content');
    },
    render: function(){
        if(!this.props.page.getIn(['content', 'search_results']) && this.props.page.get('fetching')){
            return <div className="search-results"><div className="csspinner" /></div>
        }
        else if(this.props.page.getIn(['content', 'search_results'])){
            var total = this.props.page.getIn(['content', 'search_results', 'total']).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return <div className="search-results">
                <div className="search-count">{total} Results Found</div>
                    { this.props.page.getIn(['content', 'search_results', 'hits']).map(function(r, i){
                            return <SearchResult key={r.getIn(['fields', 'id', 0])+''+i} data={r} viewer_id={this.props.viewer_id}/>
                        }, this).toJS()
                    }
                    {this.props.page.get('fetching') ?  <div className="csspinner" /> : null }
                </div>
        }
        else{
            return <div className="search-results"><div className="article-error"><p className="text-danger">{this.props.page.getIn(['content', 'error'])}</p></div></div>
        }
    }

});