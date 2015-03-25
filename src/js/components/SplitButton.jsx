var React = require('react');
var BootstrapMixin = require('react-bootstrap/lib/BootstrapMixin');
var DropdownStateMixin = require('react-bootstrap/lib/DropdownStateMixin');
var Button = require('react-bootstrap/lib/Button');
var ButtonGroup = require('react-bootstrap/lib/ButtonGroup');
var DropdownMenu = require('react-bootstrap/lib/DropdownMenu');
var classSet = require('classnames');

var InputGroup = React.createClass({displayName: "InputButtonGroup",

  mixins: [BootstrapMixin],

  propTypes: {
    vertical:  React.PropTypes.bool,
    justified: React.PropTypes.bool
  },

  getDefaultProps: function () {
  },

  render: function () {
    var classes = this.getBsClassSet();
    return (
      React.createElement("div", React.__spread({},
        this.props,
        {className: classSet(this.props.className, classSet(classes))}),
        this.props.children
      )
    );
  }
});

var SplitButton = React.createClass({displayName: "SplitButton",
  mixins: [BootstrapMixin, DropdownStateMixin],

  propTypes: {
    pullRight:     React.PropTypes.bool,
    title:         React.PropTypes.node,
    href:          React.PropTypes.string,
    target:        React.PropTypes.string,
    dropdownTitle: React.PropTypes.node,
    onClick:       React.PropTypes.func,
    onSelect:      React.PropTypes.func,
    disabled:      React.PropTypes.bool
  },

  getDefaultProps: function () {
    return {
      dropdownTitle: 'Toggle dropdown'
    };
  },

  render: function () {
    var groupClasses = {
        'open': this.state.open,
        'dropup': this.props.dropup,
        'input-group-btn': true
      };

    var button = (
      React.createElement(Button, React.__spread({},
        this.props,
        {ref: "button",
        onClick: this.handleButtonClick,
        title: null,
        id: null}),
        this.props.title
      )
    );

    var dropdownButton = (
      React.createElement(Button, React.__spread({},
        this.props,
        {ref: "dropdownButton",
        className: classSet(this.props.className, 'dropdown-toggle'),
        onClick: this.handleDropdownClick,
        title: null,
        href: null,
        target: null,
        id: null}),
        React.createElement("span", {className: "sr-only"}, this.props.dropdownTitle),
        React.createElement("span", {className: "caret"})
      )
    );

    return (
      React.createElement(InputGroup, {
        bsSize: this.props.bsSize,
        className: classSet(groupClasses),
        id: this.props.id},
        button,
        dropdownButton,
        React.createElement(DropdownMenu, {
          ref: "menu",
          onSelect: this.handleOptionSelect,
          "aria-labelledby": this.props.id,
          pullRight: this.props.pullRight},
          this.props.children
        )
      )
    );
  },

  handleButtonClick: function (e) {
    if (this.state.open) {
      this.setDropdownState(false);
    }

    if (this.props.onClick) {
      this.props.onClick(e, this.props.href, this.props.target);
    }
  },

  handleDropdownClick: function (e) {
    e.preventDefault();

    this.setDropdownState(!this.state.open);
  },

  handleOptionSelect: function (key) {
    if (this.props.onSelect) {
      this.props.onSelect(key);
    }

    this.setDropdownState(false);
  }
});

module.exports = SplitButton;
