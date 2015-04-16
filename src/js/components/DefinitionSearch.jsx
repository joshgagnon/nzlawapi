"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var ButtonToolbar = require('react-bootstrap/lib/ButtonToolbar');
var Actions = require('../actions/Actions');
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var ArticleHandlers = require('./ArticleHandlers.jsx');
var PageMixins = require('../mixins/Page');
var Popovers = require('./Popovers.jsx');

var DefinitionResult = React.createClass({
    render: function() {
         return (
            <div className="search-result">
                <div dangerouslySetInnerHTML={{__html: this.props.html}}/>
            </div>
        );
    }
});

module.exports = React.createClass({
    mixins: [ArticleHandlers, Popovers, PageMixins],
    render: function() {
        var resultContent;
        if(this.props.page.getIn(['content', 'search_results'])) {
            if(this.props.page.getIn(['content', 'search_results', 'hits'])) {
                resultContent = this.props.page.getIn(['content', 'search_results', 'hits']).map(function(r, i) {

                    return r.getIn(['fields', 'html']).map(function(html, j){
                        return <DefinitionResult html={html} key={i+'-'+j}/>
                    })

                });
            }
            else {
                resultContent = <div className="search-count">No Results Found</div>;
            }
        }
        else if(this.props.page.get('fetching')) {
            resultContent = <div className="csspinner" />;
        }
        else {
            resultContent = <div className="article-error"><p className="text-danger">{this.props.page.getIn(['content', 'error'])}</p></div>;
        }
        var total = this.props.page.getIn(['content', 'search_results', 'total']);
        return (
            <div className="search-results legislation-result" onClick={this.interceptLink}>
                <div className="search-count">{total} Results Found</div>
                {resultContent}
                { this.renderFullPopovers({getScrollContainer: this.getScrollContainer}) }
                { this.renderMobilePopovers() }
            </div>
    );
    }
});
