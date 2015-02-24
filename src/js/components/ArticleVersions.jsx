"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');

module.exports = React.createClass({
    componentDidMount: function(){
        Actions.requestVersions(this.props.article.get('id'));
    },
    render: function(){
        var className = "article-versions";
        if(this.props.article.getIn(['article-verions','fetching'])){
            className += " csspinner traditional";
        }
        var refs = this.props.article.getIn(['versions', 'versions_data']);
        if(refs && refs.size){
            return <div className={className}>
                { refs.map(function(r, i){
                    return <li key={i}><a href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')} <span>{r.get('year')}</span><span>{r.get('version')}</span></a></li>;
                }) }
                </div>
        }
        else{
            return <div className={className}>
                </div>
         }
     }
    });