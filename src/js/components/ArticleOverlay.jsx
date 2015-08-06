"use strict";

var React = require('react/addons');
var Actions = require('../actions/Actions');
var Utils = require('../utils');
var Immutable = require('immutable');
var DynamicArticleBreadCrumbs = require('./BreadCrumbs.jsx');
var Find = require('./Find.jsx');


var ArticleOverlay= React.createClass({
    render: function(){
        var className = this.props.viewer_id === 'tab-0' ? ' left' : ' right';
        return <div className={"article-overlay"+className}>
                 { this.props.page && this.props.page.getIn(['content','format']) === 'fragment' ?
                     <DynamicArticleBreadCrumbs {...this.props} content={this.props.page.get('content')} /> : null }
                { this.props.page && this.props.view.getIn(['settings', this.props.page.get('id'), 'find']) ? <Find {...this.props}/> : null }
            </div>
    }
});


module.exports = ArticleOverlay;