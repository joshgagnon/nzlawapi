var React = require('react');
var BootstrapMixin = require('react-bootstrap/BootstrapMixin');
var cloneWithProps = require('react-bootstrap/utils/cloneWithProps');

var ValidComponentChildren = require('react-bootstrap/utils/ValidComponentChildren');
var Nav = require('react-bootstrap/Nav');
var Button = require('react-bootstrap/Button');
var NavItem = require('react-bootstrap/NavItem');
var _ = require('lodash');

function getDefaultActiveKeyFromChildren(children) {
  var defaultActiveKey;

  ValidComponentChildren.forEach(children, function(child) {
    if (defaultActiveKey == null) {
      defaultActiveKey = child.props.eventKey;
    }
  });

  return defaultActiveKey;
}

var TabbedArea = React.createClass({displayName: "TabbedArea",
  mixins: [BootstrapMixin],

  propTypes: {
    bsStyle: React.PropTypes.oneOf(['tabs','pills']),
    animation: React.PropTypes.bool,
    onSelect: React.PropTypes.func
  },

  getDefaultProps: function () {
    return {
      bsStyle: "tabs",
      animation: true
    };
  },

  getInitialState: function () {
    var defaultActiveKey = this.props.defaultActiveKey != null ?
      this.props.defaultActiveKey : getDefaultActiveKeyFromChildren(this.props.children);

    // TODO: In __DEV__ mode warn via `console.warn` if no `defaultActiveKey` has
    // been set by this point, invalid children or missing key properties are likely the cause.

    return {
      activeKey: defaultActiveKey,
      previousActiveKey: null,
      dropdown: true,
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var activeKey = this.props.activeKey;
    if (nextProps.activeKey != null && nextProps.activeKey !== activeKey &&
        _.some(nextProps.children, function(c){ return c.props.key === activeKey })){
      this.setState({
        previousActiveKey: activeKey
      });
    }
  },

  handlePaneAnimateOutEnd: function () {
    this.setState({
      previousActiveKey: null
    });
  },

  renderNav: function(){
    var activeKey = this.getActiveKey();

    function renderTabIfSet(child) {
      return child.props.tab != null ? this.renderTab(child) : null;
    }
    function renderDropIfSet(child) {
      return child.props.tab != null ? this.renderDrop(child) : null;
    }

    if(this.state.dropdown){
     return  (<div className="btn-group" ref="dropdown" {...this.props}>
              <Button type="input" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">{this.getActiveLabel() +' '}
                <span className="caret"></span>
                <span className="sr-only">Toggle Dropdown</span>
              </Button>
              <ul className="dropdown-menu" role="menu">
                  { ValidComponentChildren.map(this.props.children, renderDropIfSet, this) }
                </ul>
              </div>)
    }
    else{
      return  (
        React.createElement(Nav, React.__spread({},  this.props, {activeKey: activeKey, onSelect: this.handleSelect, ref: "tabs"}),
          ValidComponentChildren.map(this.props.children, renderTabIfSet, this)
        )
      );
    }
  },

  render: function () {
    return (
      React.createElement("div", null,
        this.renderNav(),
        React.createElement("div", {id: this.props.id, className: "tab-content", ref: "panes"},
          ValidComponentChildren.map(this.props.children, this.renderPane)
        )
      )
    );
  },

  getActiveKey: function () {
    return this.props.activeKey != null ? this.props.activeKey : this.state.activeKey;
  },

  getActiveLabel: function(){
    var active = this.getActiveKey();
     return _.find(this.props.children, function(t){
        return t.key === active;
      }).props.tab;
  },

  renderPane: function (child, index) {
    var activeKey = this.getActiveKey();
    return cloneWithProps(
        child,
        {
          active: (child.props.eventKey === activeKey &&
            (this.state.previousActiveKey == null || !this.props.animation)),
          ref: child.ref,
          key: child.key ? child.key : index,
          animation: this.props.animation,
          onAnimateOutEnd: (this.state.previousActiveKey != null &&
            child.props.eventKey === this.state.previousActiveKey) ? this.handlePaneAnimateOutEnd: null
        }
      );
  },
  renderTab: function (child) {
    var key = child.props.eventKey;
    return <NavItem ref={'tab' + key} eventKey={key} >
            <span className="tab-title">
              {child.props.tab}
            </span>
            { this.props.onClose ? <span className="tab-close" onClick={this.handleClose.bind(this, key)}>&times;</span> : null }
          </NavItem>
  },

  renderDrop: function (child) {
    var key = child.props.eventKey;
    return <li ref={'tab' + key} eventKey={key} onClick={this.handleSelect.bind(this, key)}>
              <a href="#">
            <span className="tab-title">
              {child.props.tab}
            </span>
            { this.props.onClose ? <span className="tab-close" onClick={this.handleClose.bind(this, key)}>&times;</span> : null }
            </a>
          </li>
  },

  shouldComponentUpdate: function() {
    // Defer any updates to this component during the `onSelect` handler.
    return !this._isChanging;
  },

  handleClose: function(key, e){
    if(this.props.onClose){
        e.preventDefault();
        e.stopPropagation();
        this.props.onClose(key);
    }
  },
  handleSelect: function (key) {
    if (this.props.onSelect) {
      this._isChanging = true;
      this.props.onSelect(key);
      this._isChanging = false;
    } else if (key !== this.getActiveKey()) {
      this.setState({
        activeKey: key,
        previousActiveKey: this.getActiveKey()
      });
    }
  }
});

module.exports = TabbedArea;