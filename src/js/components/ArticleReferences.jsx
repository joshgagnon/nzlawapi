"use strict"
var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');
var RESOURCE_TYPES = require('../constants').RESOURCE_TYPES;
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;


module.exports = React.createClass({
    propTypes: {
        article: React.PropTypes.object.isRequired
    },
    mixins: [
        PureRenderMixin
    ],
    componentDidMount: function(){
        Actions.requestSubResource(RESOURCE_TYPES.REFERENCES, this.props.article.get('id'));
    },
    componentDidUpdate: function(){
        Actions.requestSubResource(RESOURCE_TYPES.REFERENCES, this.props.article.get('id'));
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
        var refs = this.props.article.getIn(['references', 'references']);
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