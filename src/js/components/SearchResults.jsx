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
        var query = {find: 'full', type: this.props.data._type, id: this.props.data.fields.id[0]};
        Actions.newResult({query: query, title: this.getTitle()});
    },
    render: function(){
        var html = (this.props.data.highlight.document).join(''),
            id = this.props.data.fields.id[0];
        return <div className="search-result">
                <h4><a href={"/document/"+id} onClick={this.handleLinkClick}>{ this.getTitle() }</a></h4>
                <div dangerouslySetInnerHTML={{__html: html}} />
            </div>
    }
});

module.exports = React.createClass({
    componentDidMount: function(){
        var self = this;
        var offset = 100; //calculate
        var threshold = 500;
        this.debounce_scroll = _.debounce(function(){
            if(!self.props.result.finished &&
                !self.props.result.fetching &&
                $(window).scrollTop() + offset +$(window).height() > $(self.getDOMNode()).height() - threshold){
                Actions.getMoreResult(self.props.result);
            }

        }, 100);
        $(window).on('scroll', this.debounce_scroll);
    },
    componentWillUnmount: function(){
        $(window).off('scroll', this.debounce_scroll);
    },
    render: function(){
        var total = this.props.result.content.search_results.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return <div className="search-results">
            <div className="search-count">{total} Results Found</div>
                { this.props.result.content.search_results.hits.map(function(r){
                        return <SearchResult key={r.fields.id[0]} data={r} />
                    })
                }
                {this.props.result.fetching ?  <div className="csspinner traditional" /> : null }
            </div>
    }

});