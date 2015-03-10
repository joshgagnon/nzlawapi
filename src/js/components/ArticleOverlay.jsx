"use strict";

var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var Utils = require('../utils');
var Immutable = require('immutable');



var ArticleFocusLocationStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.state = Immutable.fromJS([]);
    },
    onArticleFocusLocation: function(state){
        this.state = Immutable.fromJS(state);
        this.trigger(this.state)
    }
});




var FullArticleButton = React.createClass({
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    handleClick: function(){
        var id = this.props.content.getIn(['query', 'govt_location']);
        var location = Utils.splitLocation(this.props.content.getIn(['query', 'location']) || '');
        if(id){
            id = '#'+id;
        }
        Actions.newPage({
            title: this.props.content.get('title'),
            query: {doc_type:
            this.props.content.get('doc_type'),
            find: 'full',
            id: this.props.content.get('document_id')}}, this.props.viewer_id, {position: {id: id, location: location}})
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
    },
    render: function(){
        return   <button onClick={this.handleClick} className="btn btn-info">Add To Print</button>
    }
});

var ArticleFocusBreadCrumbs = React.createClass({
    propTypes: {
       page: React.PropTypes.object.isRequired,
    },
    mixins:[
       Reflux.listenTo(ArticleFocusLocationStore, 'onLocation')
    ],
    getInitialState: function(){
        return {breadcrumbs: Immutable.fromJS([])};
    },
    onLocation: function(location){
        this.setState({breadcrumbs: location})
    },
    handleClick: function(i, event){
        Actions.newPage({
            title: this.state.breadcrumbs.getIn([i, 'title']),
            query: this.state.breadcrumbs.getIn([i, 'query']).toJS(),
        }, this.props.viewer_id);
        event.preventDefault();
    },
    render: function(){
        return <ol className="breadcrumb">
                { this.state.breadcrumbs.map(function(v, i){
                    return <li key={i}>
                    <a onClick={this.handleClick.bind(this, i)}
                        href={Utils.queryUrl(v.get('query').toJS())}>
                    {v.get('repr')}</a></li>
                }, this).toJS()}
        </ol>

    }
});


var ArticleOverlay= React.createClass({
    propTypes: {
       page: React.PropTypes.object.isRequired,
    },
    render: function(){
        return <div className="article-overlay">

                 { this.props.page.getIn(['content','format']) === 'fragment'?
                     <ArticleFocusBreadCrumbs page={this.props.page} viewer_id={this.props.viewer_id}/> : null }
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