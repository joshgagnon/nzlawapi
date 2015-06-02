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
var GetMore = require('../mixins/GetMore')
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;


module.exports = React.createClass({
    mixins: [ArticleHandlers, PageMixins, GetMore, PureRenderMixin],
    propTypes: {
        page: React.PropTypes.object.isRequired
    },
    getDocumentId: function(){
        return this.props.page.getIn(['query', 'id'])
    },
    getTitle: function(){
        return this.props.page.getIn(['query', 'title'])
    },
    render: function() {
        var resultContent;
        var width = 1200;
        if(this.props.page.getIn(['content', 'search_results'])) {
            if(this.props.page.getIn(['content', 'search_results', 'hits'])) {
                resultContent = this.props.page.getIn(['content', 'search_results', 'hits']).map(function(r, i) {
                    return r.getIn(['highlight', 'html']).map(function(html, j){
                        return <div className="legislation">
                            <div dangerouslySetInnerHTML={{__html: html}} key={i+'-'+j}/>
                            </div>
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
                <Popovers width={width} viewer_id={this.props.viewer_id} view={this.props.view} page={this.props.page} get_container={this.getContainer} />
            </div>
    );
    }
});
