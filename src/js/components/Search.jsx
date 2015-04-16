"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');
var strings = require('../strings');
var AdvancedSearch = require('./AdvancedSearch.jsx');
var SearchResults = require('./SearchResults.jsx');
var DefinitionSearch = require('./DefinitionSearch.jsx');
var ContainsSearch = require('./ContainsSearch.jsx');
var SEARCH_TYPES = require('../constants').SEARCH_TYPES;

module.exports = React.createClass({
    renderPage: function(){
        var result;
        switch(this.props.page.get('search_type')){
            case(SEARCH_TYPES.DEFINITION):
                result = <DefinitionSearch {...this.props} />
                break;
            case(SEARCH_TYPES.CONTAINS):
                result  = <ContainsSearch {...this.props}/>
                break;
            default:
                result = <SearchResults {...this.props}/>
        }
        return result;
    },
    advancedStub: function(){
        return <div className="advanced-search stub">
            <div className="container">
                <div className="toggle-row">
                    <a role="button"  onClick={Actions.toggleAdvanced.bind(null, this.props.viewer_id, this.props.page.get('id'))}>Advanced Search</a>
                </div>
            </div>
        </div>
    },
    render: function(){
        return <div>
            { this.props.view.getIn(['settings', this.props.page.get('id'), 'advanced_search']) ?
                <AdvancedSearch viewer_id={this.props.viewer_id} page_id={this.props.page.get('id')} query={this.props.page.get('query')} />
            : this.advancedStub() }
            { this.renderPage() }
        </div>
    }

});