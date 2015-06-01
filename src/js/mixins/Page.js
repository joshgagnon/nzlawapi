var React = require('react/addons');
var Actions = require('../actions/Actions');
var $ = require('jquery');
var _ = require('lodash');
var EventListener = require('react-bootstrap/lib/utils/EventListener');

module.exports = {
    getInitialState: function(){
        return {width: null}
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
       this.setState({width: React.findDOMNode(this).clientWidth});
      this._window_listener = EventListener.listen(window, 'resize', _.debounce(function(){
          var el = React.findDOMNode(this);
          if(el){
            this.setState({width: React.findDOMNode(this).clientWidth});
          }
      }.bind(this), 300));
    },
    componentDidUnmount: function(){
        this._window_listener.remove();
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