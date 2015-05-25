"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var utils = require('../utils');


module.exports = React.createClass({
    propTypes: {
        article: React.PropTypes.object.isRequired
    },
    componentDidMount: function(){
        Actions.requestVersions(this.props.article.get('id'));
    },
    componentDidUpdate: function(){
        Actions.requestVersions(this.props.article.get('id'));
    },
    handleLinkClick: function(id, doc_type, title, e){
        e.preventDefault();
        Actions.newPage({
            query: {
                id: id,
                doc_type: doc_type
            },
            title: title
        }, this.props.viewer_id)
    },
    render: function(){
        var className = "article-versions";
        if(this.props.article.getIn(['versions','fetching'])){
            className += " csspinner traditional";
        }

        var refs = this.props.article.getIn(['versions', 'versions_data']);
        if(refs && refs.size){
            return <div className={className}>
                    <table className="table versions-table">
                        { refs.map(function(r, i){
                            if(this.props.article.getIn(['query', 'document_id']) === r.get('id')){
                                return <tr key={i}><td>{r.get('title')}</td>
                                <td>{utils.formatGovtDate(r.get('date_as_at'))}</td></tr>
                            }
                            return <tr key={i}><td><a onClick={this.handleLinkClick.bind(this, r.get('id'),this.props.article.getIn(['query', 'doc_type']), r.get('title'))}
                                href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')}</a></td>
                                <td>{utils.formatGovtDate(r.get('date_as_at'))}</td></tr>
                        }, this).toJS() }
                    </table>
                </div>
        }
        else{
            return <div className={className}>
                </div>
         }
     }
});