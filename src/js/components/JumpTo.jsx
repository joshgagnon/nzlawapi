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
        return {article_location: this.props.position ? this.props.position.get('repr') : ''};
    },
    onPositionChange: function(value){
        if(value && this.refs.jump_to.getInputDOMNode() !== document.activeElement){
            this.setState({article_location: value.get('repr') });
        }
    },
    onKeyDown: function(event){
         if (event.key === 'Enter'){
            this.jumpTo();
         }
    },
    jumpTo: function(e){
        if(e){
            e.preventDefault();
        }
        var loc = this.state.article_location;
        if(loc){
            var m = Utils.splitLocation(loc);
            console.log('fire action')
            Actions.articleJumpTo(this.props.viewer_id, {location: m, id: null, repr: loc});
        }
    },
    componentWillReceiveProps: function(nextProps){
        if(nextProps.position){
            this.setState({'article_location': this.onPositionChange(nextProps.position)});
        }
    },
    render: function(){
        return <Input ref="jump_to" name="jump_to" type="text" onKeyDown={this.onKeyDown}
            bsStyle={this.state.jumpToError ? 'error': null} hasFeedback={!!this.state.jumpToError}
            valueLink={this.linkState('article_location')}
            buttonAfter={<Button type="input" bsStyle="info" onClick={this.jumpTo}>Jump To</Button>} />
    }
})
