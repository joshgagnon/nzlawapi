"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');

module.exports = React.createClass({
    componentDidMount: function(){
        Actions.requestReferences(this.props.article.get('id'));
    },
    render: function(){
        var className = "article-references";
        var fetching = this.props.article.getIn(['references','fetching']);
        if(fetching){
            return <div className={'article-references csspinner traditional'}/>
        }
        var refs = this.props.article.getIn(['references', 'references_data']);
        if(refs && refs.size){
            return <div className={className}>
                { refs.map(function(r, i){
                    return <li key={i}><a href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')} <span>{r.get('count')}</span></a></li>;
                }) }
                </div>
        }
        else{
            return <div className={className}>
                    <span className="no-references">No References</span>
                </div>
         }
     }
    });