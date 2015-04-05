"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var ButtonToolbar = require('react-bootstrap/lib/ButtonToolbar');
var Actions = require('../actions/Actions');
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var ArticleHandlers = require('./ArticleHandlers.jsx');
var PageMixins = require('../mixins/page');
var Popovers = require('./Popovers.jsx');

var DefinitionResult = React.createClass({
    render: function() {
         return (
            <div className="search-result">
                <div dangerouslySetInnerHTML={{__html: this.props.data.get('html')}}/>
            </div>
        );
    }
});

module.exports = React.createClass({
    mixins: [ArticleHandlers, Popovers, PageMixins],
    search: function() {
        Actions.replacePage(this.props.page.get('id'), {
            query_string: '/definitions/' + this.refs.term.getValue(),
            page_type: PAGE_TYPES.DEFINITION_SEARCH
        });
    },
    render: function() {
        var resultContent;
        if(this.props.page.getIn(['content', 'results'])) {
            if(this.props.page.getIn(['content', 'results']).count()) {
                resultContent = this.props.page.getIn(['content', 'results']).map(function(r, i) {
                    return <DefinitionResult data={r} key={i}/>;
                }).toJS();
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

        return (
            <div>
                <div className="advanced-search">
                    <form className="form-horizontal">
                        <Input type="text" label="Term" ref="term" labelClassName="col-xs-2" wrapperClassName="col-xs-10" />
                    </form>
                    <ButtonToolbar>
                        <Button bsStyle={'primary'} onClick={this.search}>Search</Button>
                    </ButtonToolbar>
                </div>
                <div className="search-results" onClick={this.interceptLink}>
                    {resultContent}
                    { this.renderFullPopovers({getScrollContainer: this.getScrollContainer}) }
                    { this.renderMobilePopovers() }
                </div>
            </div>
        );
    }
});
