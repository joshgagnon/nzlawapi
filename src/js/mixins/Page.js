var React = require('react/addons');
var Actions = require('../actions/Actions');
var $ = require('jquery');

module.exports = {
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    componentDidUpdate: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    getScrollContainer: function(){
        return $(React.findDOMNode(this)).parents('.tab-content, .results-container');
    },
    getContainer: function(){
        return React.findDOMNode(this);
    },
    overlayOffset: function(){
        return {'left': this.getScrollContainer().scrollLeft(), 'top': this.getScrollContainer().scrollTop()};
    },

};