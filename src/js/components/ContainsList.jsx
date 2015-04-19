"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');
var strings = require('../strings');
var SearchTable = require('../mixins/SearchTable.jsx');
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var SEARCH_TYPES = require('../constants').SEARCH_TYPES;
var GetMore = require('../mixins/GetMore')

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
        var query = {find: 'contains', doc_type: this.props.data.getIn(['_type']),
            id: this.props.data.getIn(['fields','id', 0]),
            contains: this.props.page.getIn(['query', 'contains']),
            contains_type: this.props.page.getIn(['query', 'contains_type'])
        };
        Actions.newPage({
            query: query,
            title: this.getTitle() +': '+this.props.page.getIn(['query', 'contains']),
            page_type: PAGE_TYPES.SEARCH,
            search_type: PAGE_TYPES.CONTAINS_RESULT,
        }, this.props.viewer_id);
    },
    render: function(){
        var html = '',
            id = this.props.data.getIn(['fields', 'id', 0]);
        /*if( this.props.data.getIn(['highlight'])){
            html = (this.props.data.getIn(['highlight','document']) ||[]).join('');
        }*/

        return <tr className="search-result" onClick={this.handleLinkClick}>
        <td>{ this.props.index + 1}</td>
        <td><a href={"/open_article/"+this.props.data.get('_type')+'/'+id} >{ this.getTitle() }</a></td>
        <td> { this.getType() } </td>
        <td> { this.getYear() }</td>
        </tr>
    }
});

module.exports = React.createClass({
    mixins: [
        SearchTable, GetMore
    ],
    renderRow: function(data, index){
        return <SearchResult index={index} key={data.getIn(['fields', 'id', 0])+''+index} data={data} page={this.props.page} viewer_id={this.props.viewer_id}/>;
    },
    render: function(){
        return this.renderTable();
    }
});