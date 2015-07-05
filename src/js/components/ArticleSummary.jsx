"use strict";
var React = require('react/addons')
var Actions = require('../actions/Actions');
var _ = require('lodash')
var RESOURCE_TYPES = require('../constants').RESOURCE_TYPES;
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var fields = [
    ['title', 'Title'],
    ['type', 'Type'],
    ['subtype', 'Subtype'],
    ['number', 'Number'],
    ['version', 'Version'],
    ['date_first_valid', 'Date First Valid'],
    ['date_assent', 'Date Assent'],
    ['date_gazetted', 'Date Gazetted'],
    ['date_terminated', 'Date Terminated'],
    ['date_imprint', 'Date Imprint'],
    ['date_signed', 'Date Signed'],
    ['year', 'Year'],
    ['repealed', 'Repealed'],
    ['in_amend', 'In Amend'],
    ['raised_by', 'Raised By'],
    ['stage', 'Stage'],
    ['imperial', 'Imperial'],
    ['offical', 'Official'],
    ['instrucing_office', 'Instrucing Office'],
];



var format = function(field, value){
    if(field === 'in_amend'){
        return value ? 'Yes': 'No';
    }
    if(field === 'type'){
        return _.capitalize(value)
    }
    if(field === 'subtype'){
        return _.capitalize(value)
    }
    return value;
}

module.exports = React.createClass({
    propTypes: {
        article: React.PropTypes.object.isRequired
    },
    mixins: [
        PureRenderMixin
    ],
    componentDidMount: function(){
        Actions.requestSubResource(RESOURCE_TYPES.SUMMARY, this.props.article.get('id'));
    },
    componentDidUpdate: function(){
        Actions.requestSubResource(RESOURCE_TYPES.SUMMARY, this.props.article.get('id'));
    },
    handleLinkClick: function(id, doc_type, title, e){
        e.preventDefault();
        Actions.newPage({
            query: {
                id: id,
                doc_type: doc_type
            },
            title: title
        }, this.props.viewer_id)
    },
    renderAmending: function(){
        var amending = this.props.article.getIn(['summary', 'amending']);
        if(amending && amending.size){
            return <div><h5>Amendments</h5>
            <table className="table summary-table">
            <thead><tr><th>Title</th><th>Count</th></tr></thead>
            <tbody>
                        { amending.map(function(r, i){
                            return <tr key={i}><td><a onClick={this.handleLinkClick.bind(this, r.get('id'),this.props.article.getIn(['query', 'doc_type']), r.get('title'))}
                                href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')}</a></td>
                                <td>{r.get('count')}</td></tr>
                        }, this).toJS() }
                        </tbody></table></div>
        }
    },
    renderSubordinate: function(){
        var amending = this.props.article.getIn(['summary', 'subordinate']);
        if(amending && amending.size){
            return <div><h5>Subordinates</h5>
            <table className="table summary-table">
            <thead><tr><th>Title</th><th>Count</th></tr></thead>
            <tbody>
                        { amending.map(function(r, i){
                            return <tr key={i}><td><a onClick={this.handleLinkClick.bind(this, r.get('id'),this.props.article.getIn(['query', 'doc_type']), r.get('title'))}
                                href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')}</a></td></tr>
                        }, this).toJS() }
                        </tbody></table></div>
        }
    },
    renderParent: function(){
        var parent = this.props.article.getIn(['summary', 'parent']);
        if(parent && parent.size){
            return <div><h5>Principal Legislation</h5>
            <a onClick={this.handleLinkClick.bind(this, parent.get('id'),this.props.article.getIn(['query', 'doc_type']), parent.get('title'))}
                                href={"/open_article/"+this.props.article.getIn(['query', 'doc_type'])+'/'+parent.get('id')}>{parent.get('title')}</a>
            </div>
        }
    },
    render: function(){
        var className = "article-summary";
        if(this.props.article.getIn(['summary', 'fetching'])){
            className += " csspinner traditional";
        }
        return <div className={className}>
        <dl className="dl-horizontal">
            { _.map(fields, function(v){
                if(this.props.article.getIn(['summary', 'attributes', v[0]])){
                    return <div key={v[0]} ><dt>{v[1]}</dt>
                        <dd>{format(v[0], this.props.article.getIn(['summary', 'attributes', v[0]]))}</dd>
                    </div>
                }
            }.bind(this))}
            </dl>
            { this.renderParent() }
            { this.renderAmending() }
            { this.renderSubordinate() }
        </div>
    },
});
