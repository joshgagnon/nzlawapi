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
        return {find_term: ''};
    },
    onPositionChange: function(value){
        if(value && this.refs.find.getInputDOMNode() !== document.activeElement){
            this.setState({find_term: value.get('repr') });
        }
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
        Actions.highlightParts(this.props.page.get('id'), this.props.viewer_id, this.state.find_term);
    },
    render: function(){
        return <div className={"find"}><Input  ref="find" name="find" type="text" onKeyDown={this.onKeyDown}
            bsStyle={this.state.jumpToError ? 'error': null}
            valueLink={this.linkState('find_term')}
            buttonAfter={<Button type="input" bsStyle="info" onClick={this.submit}>Find</Button>} /></div>
    }
})
