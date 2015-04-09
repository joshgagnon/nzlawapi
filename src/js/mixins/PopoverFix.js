var React = require('react/addons');

var ReactDNDIE9MixIn = {
  componentDidMount: function () {
    if (React.findDOMNode(this).dragDrop) {
      React.findDOMNode(this.addEventListener('selectstart', this.ie9fix));
    }
  },

  componentWillUnmount: function () {
    if (React.findDOMNode(this).dragDrop) {
      React.findDOMNode(this.removeEventListener('selectstart', this.ie9fix));
    }
  },

  ie9fix: function(ev) {
    ev.preventDefault();
    React.findDOMNode(React.findDOMNode(this).dragDrop());
  },
};