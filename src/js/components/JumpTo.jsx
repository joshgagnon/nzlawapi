var React = require('react/addons');
var Actions = require('../actions/Actions');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var ArticleStore = require('../stores/ArticleStore');

var Reflux = require('reflux');
var _ = require('lodash');

module.exports = React.createClass({
    mixins: [
      Reflux.listenTo(ArticleStore,"onPositionChange"),
      React.addons.LinkedStateMixin
    ],
    getInitialState: function(){
        return {};
    },
    onPositionChange: function(value){
        this.setState({article_location: value.repr});
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
            var m = _.filter(loc.split(/[,()]/)).map(function(s){
                s = s.trim();
                if(s.indexOf('cl') === 0){
                    s = ', '+s;
                }
                else if(s.indexOf(' ') === -1 && s.indexOf('[') === -1){
                    s = '('+s+')';
                }
                return s;
            });
            Actions.articleJumpTo(this.props.article, {location: m});
        }
    },
    render: function(){
        return <Input ref="jump_to" name="jump_to" type="text" onKeyDown={this.onKeyDown}
            bsStyle={this.state.jumpToError ? 'error': null} hasFeedback={!!this.state.jumpToError}
            valueLink={this.linkState('article_location')}
            buttonAfter={<Button type="input" bsStyle="info" onClick={this.jumpTo}>Jump To</Button>} />
    }
})
