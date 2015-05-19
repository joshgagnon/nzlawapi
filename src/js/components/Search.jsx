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
var ContainsList= require('./ContainsList.jsx');
var ContainsResult = require('./ContainsResult.jsx');
var SEARCH_TYPES = require('../constants').SEARCH_TYPES;

module.exports = React.createClass({
    propTypes: {
        page: React.PropTypes.object.isRequired
    },
    renderPage: function(){
        var result;
        switch(this.props.page.get('search_type')){
            case(SEARCH_TYPES.DEFINITION):
                result = <DefinitionSearch {...this.props} />
                break;
            case(SEARCH_TYPES.CONTAINS_LIST):
                result  = <ContainsList {...this.props}/>
                break;
            case(SEARCH_TYPES.CONTAINS_RESULT):
                result  = <ContainsResult {...this.props}/>
                break;
            default:
                result = <SearchResults {...this.props}/>
        }
        return result;
    },

    render: function(){
        return <div>
                <AdvancedSearch viewer_id={this.props.viewer_id} view={this.props.view} page_id={this.props.page.get('id')} query={this.props.page.get('query')} />
            { this.renderPage() }
        </div>
    }
         //   : this.advancedStub() }
          //  { this.props.view.getIn(['settings', this.props.page.get('id'), 'advanced_search']) ?

});