"use strict";
var React = require('react/addons');
var Actions = require('../actions/Actions');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var Utils = require('../utils.js');
var Reflux = require('reflux');
var _ = require('lodash');


module.exports = React.createClass({
    mixins: [
      React.addons.LinkedStateMixin
    ],
    getInitialState: function(){
        return {find_term: this.props.page.getIn(['query', 'highlight']) || ''};
    },
    onKeyDown: function(event){
         if (event.key === 'Enter'){
            this.submit();
         }
    },
    submit: function(e){
        if(e){
            e.preventDefault();
        }
        Actions.findTerm(this.props.viewer_id, this.props.page.get('id'),
            this.state.find_term, {position: this.props.view.getIn(['positions', this.props.page.get('id')]).toJS()});
    },
    next: function(e){
        Actions.articleJumpTo(this.props.viewer_id, {next_highlight: true});
    },
    prev: function(e){
        Actions.articleJumpTo(this.props.viewer_id, {prev_highlight: true});
    },
    close: function(e){
        Actions.closeFind(this.props.viewer_id, this.props.page.get('id'));
    },
    render: function(){
        return <div className="find">
                <div className="form-group" >
                    <div className="input-group">
                    <span className="input-group-btn">
                        <button type="input" className="btn btn-info sml" onClick={this.close}><span className="fa fa-close"></span></button>
                        </span>
                        <input name="find" type="text" className="form-control" valueLink={this.linkState('find_term')} onKeyDown={this.onKeyDown} />
                        <span className="input-group-btn">
                            <button type="input" className="btn btn-info" onClick={this.submit}>Find</button>
                            <button type="input" className="btn btn-info sml" onClick={this.prev}><span className="fa fa-chevron-up"></span></button>
                            <button type="input" className="btn btn-info sml" onClick={this.next}><span className="fa fa-chevron-down"></span></button>
                        </span>
                    </div>
                </div>
            </div>
    }
})

