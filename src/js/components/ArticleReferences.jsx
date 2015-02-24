"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');

module.exports = React.createClass({
    componentDidMount: function(){
        Actions.requestReferences(this.props.article.get('id'));
    },
    componentDidUpdate: function(){
        Actions.requestReferences(this.props.article.get('id'));
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
        var className = "article-references";
        var fetching = this.props.article.getIn(['references','fetching']);
        if(fetching){
            return <div className={'article-references csspinner traditional'}/>
        }
        var refs = this.props.article.getIn(['references', 'references_data']);
        if(refs && refs.size){
            return <div className={className}>
                <table className="table references-table">
                    { refs.map(function(r, i){
                        return <tr key={i}>
                            <td><a onClick={this.handleLinkClick.bind(this, r.get('id'),r.get('type'), r.get('title'))}
                            href={"/open_article/"+r.get('type')+'/'+r.get('id')}>{r.get('title')} </a></td><td>{r.get('count')}</td>
                            </tr>
                    }, this).toJS() }
                </table>
                </div>
        }
        else{
            return <div className={className}>
                    <span className="no-references">No References</span>
                </div>
         }
     }
    });