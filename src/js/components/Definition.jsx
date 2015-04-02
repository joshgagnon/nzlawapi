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
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [ArticleHandlers, Popovers],
    warningsAndErrors: function(){
        if(this.props.page.getIn(['content', 'error'])){
            return <div className="legislation-result"><DefinitionError error={this.props.page.getIn(['content', 'error'])}/></div>
        }
        return null;
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container');
    },
    render: function(){

        return <div className="result-container" onClick={this.interceptLink}>
                { this.warningsAndErrors() }
                {this.props.page.getIn(['content','html_content']) ?
                    <div ref="content" className="legislation-result" >
                        <div dangerouslySetInnerHTML={{__html: this.props.page.getIn(['content','html_content'])}} />
                                     { this.renderFullPopovers() }
                                    { this.renderMobilePopovers() }
                    </div> :
                    null }

            </div>
    }
 });
