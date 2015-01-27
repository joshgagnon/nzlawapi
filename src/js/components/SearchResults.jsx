"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');

var SearchResult = React.createClass({
    getTitle: function(){
        return (this.props.data.fields.title || this.props.data.fields.full_citation)[0]
    },
    handleLinkClick: function(e){
        e.preventDefault();
        var query = {find: 'full', type: this.props.data._type, id: this.props.data.fields.id[0]};
        $.get('/query', query)
            .then(function(data){
                Actions.newResult({query: query, content: data})
            });
    },
    render: function(){
        var html = (this.props.data.highlight.document).join(''),
            id = this.props.data.fields.id[0];
        return <div  className="search-result">
            <h4><a href={"/document/"+id} onClick={this.handleLinkClick}>{ this.getTitle() }</a></h4>
            <div dangerouslySetInnerHTML={{__html: html}} />
        </div>
    }
});

module.exports = React.createClass({

    render: function(){
        var total = this.props.result.content.search_results.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return <div className="search-results">
        <div className="search-count">{total} Results Found</div>
            { this.props.result.content.search_results.hits.map(function(r){
                    return <SearchResult key={r.fields.id[0]} data={r} />
                })
            }
        </div>
    }

});