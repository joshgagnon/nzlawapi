"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var ReferencesStore = require('../stores/ReferencesStore.js');
var _ = require('lodash');

module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(ReferencesStore, 'onUpdate'),
    ],
    getInitialState: function(){
        return {active: 0}
    },
    onUpdate: function(article){
        if(article.id === this.props.article.id){
            //hmmm
        }
    },
    componentDidMount: function(){
        Actions.requestReferences(this.props.article);
    },
    render: function(){
        return <div className="article-references">

               { (this.props.article._references_data||[]).map(function(r, i){
                    return <li key={i}><a href={"/open_article/"+r.type+'s/'+r.id}>{r.title} <span>{r.count}</span></a></li>;
                }) }
            </div>
     },
    });