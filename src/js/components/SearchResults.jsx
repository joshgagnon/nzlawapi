"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');
var strings = require('../strings');

// New definition result based on this
var SearchResult = React.createClass({
    getTitle: function(){
        return (this.props.data.getIn(['fields','title', 0]) || this.props.data.getIn(['fields','full_citation', 0])) || 'Unknown'
    },
    getType: function(){
        return strings.document_types[this.props.data.getIn(['fields','type', 0])];
    },
    getYear: function(){
        return this.props.data.getIn(['fields','year', 0]);
    },
    handleLinkClick: function(e){
        e.preventDefault();
        var query = {find: 'full', doc_type: this.props.data.getIn(['_type']), id: this.props.data.getIn(['fields','id', 0])};
        Actions.newPage({query: query, title: this.getTitle()}, this.props.viewer_id);
    },
    render: function(){
        var html = '',
            id = this.props.data.getIn(['fields', 'id', 0]);
        /*if( this.props.data.getIn(['highlight'])){
            html = (this.props.data.getIn(['highlight','document']) ||[]).join('');
        }*/

        return <tr className="search-result" onClick={this.handleLinkClick}>
        <td><a href={"/open_article/"+this.props.data.get('_type')+'/'+id} >{ this.getTitle() }</a></td>
        <td> { this.getType() } </td>
        <td> { this.getYear() }</td>
        </tr>
    }
});

module.exports = React.createClass({
    componentDidMount: function(){ // Move to mixin
        var self = this;
        var offset = 100; //calculate
        var threshold = 500;
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var $scroll = $(self.getScrollContainer());
                // TO DO, calculation returns true too early if advanced search is visible
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
                <table className="table table-striped table-hover">
                <thead><tr><th className="title">Title</th><th>Type</th><th>Year</th></tr></thead>
                    <tbody>
                    { this.props.page.getIn(['content', 'search_results', 'hits']).map(function(r, i){
                            return <SearchResult key={r.getIn(['fields', 'id', 0])+''+i} data={r} viewer_id={this.props.viewer_id}/>
                        }, this).toJS()
                    }
                    </tbody>
                    </table>
                    {this.props.page.get('fetching') ?  <div className="csspinner" /> : null }
                </div>
        }
        else{
            return <div className="search-results"><div className="article-error"><p className="text-danger">{this.props.page.getIn(['content', 'error'])}</p></div></div>
        }
    }

});