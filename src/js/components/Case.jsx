"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var Actions = require('../actions/Actions');
var Popover = require('./Popover.jsx');
var ArticleOverlay= require('./ArticleOverlay.jsx');
var MQ = require('./Responsive.jsx');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var Utils = require('../utils');
var Immutable = require('immutable');
var CaseError = require('./Warnings.jsx').CaseError;

module.exports = React.createClass({
    warningsAndErrors: function(){
        if(this.props.page.getIn(['content', 'error'])){
            return <CaseError error={this.props.page.getIn(['content', 'error'])}/>
        }
        return null;
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    render: function(){
        return <div className="case-container" onClick={this.interceptLink} >
            { this.warningsAndErrors() }
            <div className="case-scaler" dangerouslySetInnerHTML={{__html: this.props.page.getIn(['content','html_content'])}} />
        </div>
    }
 });
