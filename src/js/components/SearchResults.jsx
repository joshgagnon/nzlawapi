"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');


var SearchResult = React.createClass({
    getTitle: function(){
        return (this.props.data.fields.title || this.props.data.fields.full_citation || [''])[0]
    },
    handleLinkClick: function(e){
        e.preventDefault();
        var query = {find: 'full', doc_type: this.props.data._type, id: this.props.data.fields.id[0]};
        Actions.newPage({query: query, title: this.getTitle()}, this.props.viewer_id);
    },
    render: function(){
        var html = '',
            id = this.props.data.fields.id[0];
        if( this.props.data.highlight){
            html = (this.props.data.highlight.document).join('');
        }
        return <div className="search-result">
                <h4><a href={"/open_article/"+this.props.data._type+'s/'+id} onClick={this.handleLinkClick}>{ this.getTitle() }</a></h4>
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
                if(self.isMounted() && !self.props.page.finished &&
                    !self.props.page.fetching &&
                    $scroll .scrollTop() + offset +$scroll .height() > $(self.getDOMNode()).height() - threshold){
                    Actions.getMorePage(self.props.page.id);
                }
            }
        }, 100);
        $(this.getScrollContainer()).on('scroll', this.debounce_scroll);
       if(!this.props.page.fetching && !this.props.page.fetched){
            Actions.requestPage(this.props.page.id);

        }
    },
    componentWillUnmount: function(){
        $(this.getScrollContainer()).off('scroll', this.debounce_scroll);
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container')
    },
    shouldComponentUpdate: function(newProps){
        return this.props.page.content !== newProps.page.content;
    },
    render: function(){
        if(!this.props.page.content){
            return <div className="search-results"><div className="csspinner traditional" /></div>
        }
        else if(this.props.page.content.search_results){
            var total = this.props.page.content.search_results.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return <div className="search-results">
                <div className="search-count">{total} Results Found</div>
                    { this.props.page.content.search_results.hits.map(function(r, i){
                            return <SearchResult key={r.fields.id[0]+i} data={r} viewer_id={this.props.viewer_id}/>
                        }, this)
                    }
                    {this.props.page.fetching ?  <div className="csspinner traditional" /> : null }
                </div>
        }
        else{
            return <div className="search-results"><div className="article-error"><p className="text-danger">{this.props.page.content.error}</p></div></div>
        }
    }

});