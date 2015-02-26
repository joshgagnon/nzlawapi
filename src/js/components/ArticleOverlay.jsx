"use strict";

var React = require('react/addons');
var Actions = require('../actions/Actions');

var FullArticleButton = React.createClass({
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    handleClick: function(){
        Actions.newPage({
            title: this.props.content.get('title'),
            query: {doc_type:
            this.props.content.get('doc_type'),
            find: 'full',
            id: this.props.content.get('document_id')}}, this.props.viewer_id)
    },
    render: function(){
        return  <button onClick={this.handleClick} className="btn btn-info">Full Article</button>
    }
});

var ArticlePDFButton = React.createClass({
    base_url: 'http://www.legislation.govt.nz/subscribe/',
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    render: function(){
        var url = this.props.content.getIn(['attributes', 'path']).replace('.xml', '.pdf');
        return  <a target="_blank" href={this.base_url + url} className="btn btn-info">PDF</a>
    }
});

var ArticlePDFButton = React.createClass({
    base_url: 'http://www.legislation.govt.nz/subscribe/',
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    render: function(){
        var url = this.props.content.getIn(['attributes', 'path']).replace('.xml', '.pdf');
        return  <a target="_blank" href={this.base_url + url} className="btn btn-info">PDF</a>
    }
});

var ArticleAddPrintButton = React.createClass({
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    handleClick: function(){
        Actions.addToPrint({
            title: this.props.content.get('title'),
            query: {doc_type:
            this.props.content.get('doc_type'),
            find: 'full',
            id: this.props.content.get('document_id')},
            html: this.props.content.get('html_content')
        });
        Actions.activatePrintMode();
    },
    render: function(){
        return   <button onClick={this.handleClick} className="btn btn-info">Add To Print</button>
    }
});



var ArticleOverlay= React.createClass({
    propTypes: {
       page: React.PropTypes.object.isRequired,
    },
    render: function(){
        return <div className="article-overlay">
                <div className="btn-group">
                { this.props.page.getIn(['content','format']) === 'fragment' ? <FullArticleButton
                    content={this.props.page.get('content')}
                    viewer_id={this.props.viewer_id}/> : null }
                { this.props.page.getIn(['content','format']) === 'fragment' ? <ArticleAddPrintButton
                    content={this.props.page.get('content')}
                    viewer_id={this.props.viewer_id}/> : null }
                { this.props.page.getIn(['content','attributes', 'path']) ? <ArticlePDFButton
                    content={this.props.page.get('content')}
                    viewer_id={this.props.viewer_id}/> : null }
                    </div>
            </div>
    }
});


module.exports = ArticleOverlay;