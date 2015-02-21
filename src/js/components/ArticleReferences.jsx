"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');

module.exports = React.createClass({
    componentDidMount: function(){
        Actions.requestReferences(this.props.article.id);
    },
    render: function(){
        var className = "article-references";
        if(this.props.article.references.fetching){
            className += " csspinner traditional";
        }
        return <div className={className}>
               { (this.props.article.references.references_data||[]).map(function(r, i){
                    return <li key={i}><a href={"/open_article/"+r.type+'s/'+r.id}>{r.title} <span>{r.count}</span></a></li>;
                }) }
               {(this.props.article.references.references_data||[]).length ? null : <span className="no-references">No References</span> }
            </div>
     },
    });