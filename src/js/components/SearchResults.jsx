"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');

var SearchResult = React.createClass({
    getTitle: function(){
        return (this.props.data.fields.title || this.props.data.fields.full_citation)[0]
    },
    render: function(){
        var html = (this.props.data.highlight.document).join('')
        return <div  className="search-result">
            <h4><a href={"/document/"+this.props.data.fields.id[0]}>{ this.getTitle() }</a></h4>
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