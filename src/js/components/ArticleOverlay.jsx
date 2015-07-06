"use strict";

var React = require('react/addons');
var Actions = require('../actions/Actions');
var Utils = require('../utils');
var Immutable = require('immutable');
var DynamicArticleBreadCrumbs = require('./BreadCrumbs.jsx');
var Find = require('./Find.jsx');




var ArticleOverlay= React.createClass({
    propTypes: {
       page: React.PropTypes.object.isRequired,
    },
    render: function(){
        return <div className="article-overlay">
                 { this.props.page.getIn(['content','format']) === 'fragment' ?
                     <DynamicArticleBreadCrumbs {...this.props}/> : null }
                     <Find {...this.props}/>
            </div>
    }
});


module.exports = ArticleOverlay;