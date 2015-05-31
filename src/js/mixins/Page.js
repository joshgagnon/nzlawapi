var React = require('react/addons');
var Actions = require('../actions/Actions');
var $ = require('jquery');

module.exports = {
    getInitialState: function(){
        return {width: null}
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
       this.setState({width: React.findDOMNode(this).clientWidth});
    },
    componentDidUpdate: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
      this._scrollContainer = null;
       this.setState({width: React.findDOMNode(this).clientWidth});
    },
    getScrollContainer: function(){
        // to do, remove $
        if(!this._scrollContainer){
            this._scrollContainer = $(React.findDOMNode(this)).closest('.tab-content, .results-container');
        }
        return this._scrollContainer;
    },
    getContainer: function(){
        return React.findDOMNode(this);
    },
    overlayOffset: function(){
        return {'left': this.getScrollContainer().scrollLeft(), 'top': this.getScrollContainer().scrollTop()};
    },

};