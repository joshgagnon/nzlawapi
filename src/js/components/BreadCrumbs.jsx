var React = require('react/addons');
var Actions = require('../actions/Actions');
var Utils = require('../utils');
var $ = require('jquery');
var _ = require('lodash');


var DynamicArticleBreadCrumbs = React.createClass({
    propTypes: {
      content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        return {breadcrumbs: []};
    },

    findCurrent: function(){
        var change = false;
        var target = $('.current', React.findDOMNode(this.props.container)).last();
        var locs = Utils.getLocation(target).locs;
        var doc_type = this.props.content.getIn(['query', 'doc_type']);
        var document_id = this.props.content.getIn(['query', 'document_id']);
        var links = [{
            repr: this.props.content.get('title'),
            title: this.props.content.get('title'),
            query:{
                doc_type: doc_type,
                document_id: document_id
            }
        }];
        if(!this.state.breadcrumbs[0] ||  this.state.breadcrumbs[0].repr !== this.props.content.get('title')){
            change = true;
        }
        for(var i=0;i<locs.length;i++){
            var loc = locs.slice(0, i+1).join('');
            if(!this.state.breadcrumbs[i+1] ||  this.state.breadcrumbs[i+1].repr !== locs[i]){
                change = true;
            }
            links.push({
                repr: locs[i],
                title: this.props.content.get('title') + ' '+ loc,
                query:{
                    doc_type: doc_type,
                    document_id: document_id,
                    find: 'location',
                    location: loc
                }
            });
        }
        if(change){
            this.setState({breadcrumbs: links});
        }
    },
    componentDidMount: function(){
        this.findCurrent();
    },
    componentDidUpdate: function(){
       this.findCurrent();
    },
    handleClick: function(i, event){
        Actions.newPage({
            title: this.state.breadcrumbs[i].title,
            query: this.state.breadcrumbs[i].query,
        }, this.props.viewer_id);
        event.preventDefault();
    },
    render: function(){
        return <ol className="breadcrumb">
                { _.map(this.state.breadcrumbs, function(v, i){
                    return <li key={i}>
                    <a onClick={this.handleClick.bind(this, i)}
                        href={Utils.queryUrl(v.query)}>
                    {v.repr}</a></li>
                }, this) }
        </ol>
    }
});



module.exports = DynamicArticleBreadCrumbs;