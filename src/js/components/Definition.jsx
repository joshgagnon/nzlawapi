"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var Popovers = require('./Popovers.jsx');
var ArticleHandlers = require('./ArticleHandlers.jsx');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var Utils = require('../utils');
var Immutable = require('immutable');
var DefinitionError = require('./Warnings.jsx').DefinitionError;
var PageMixins = require('../mixins/Page');
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [ArticleHandlers, PageMixins],
    propTypes: {
        page: React.PropTypes.object.isRequired
    },
    warningsAndErrors: function(){
        if(this.props.page.getIn(['content', 'error'])){
            return <div className="legislation-result"><DefinitionError error={this.props.page.getIn(['content', 'error'])}/></div>
        }
        return null;
    },
    render: function(){
        // TODO, popovers?
        return <div className="result-container" onClick={this.interceptLink}>
                { this.warningsAndErrors() }
                {this.props.page.getIn(['content','html_content']) ?
                    <div ref="content" className="legislation-result" >
                        <div dangerouslySetInnerHTML={{__html: this.props.page.getIn(['content','html_content'])}} />
                    </div> :
                    null }

            </div>
    }
 });
