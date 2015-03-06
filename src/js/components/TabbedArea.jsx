var React = require('react/addons');
var BootstrapMixin = require('react-bootstrap/lib/BootstrapMixin');
var cloneWithProps = require('react-bootstrap/lib/utils/cloneWithProps');

var ValidComponentChildren = require('react-bootstrap/lib/utils/ValidComponentChildren');
var Nav = require('react-bootstrap/lib/Nav');
var Button = require('react-bootstrap/lib/Button');
var NavItem = require('react-bootstrap/lib/NavItem');
var DropdownButton = require('react-bootstrap/lib/DropdownButton');
var MenuItem = require('react-bootstrap/lib/MenuItem');
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
      animation: true,
      max_tab_width: 202,
      min_width: 401,
      dropdown_width_requirement: 150
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
      dropdown: false,
      width: 1000 //get this later
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
  componentDidUpdate: function(prevProps){
    if(prevProps.children.length !== prevProps.children.length || this.width !== this.refs.tabs.getDOMNode().clientWidth){
      this.setTabVisibility();
    }
  },
  componentDidMount: function(){
    this._resize_handler = _.debounce(this.setTabVisibility, 100, this);
    window.addEventListener('resize', this._resize_handler);
    this.setTabVisibility();
  },
  componentWillUnmount: function(){
    window.removeEventListener('resize', this._resize_handler);
  },
  setTabVisibility: function(){
    if(this.isMounted()){
        this.width = this.refs.tabs.getDOMNode().clientWidth;
        var visible;
        if(this.width < this.props.min_width){
          visible = 0;
        }
        else{
          var width = this.width - this.props.dropdown_width_requirement;
          var tab_widths = _.filter(_.map(this.props.children, function(n){
              if(this.refs.tabs && this.refs.tabs.refs && this.refs.tabs.refs['tab'+n.props.eventKey]){
                return this.refs.tabs.refs['tab'+n.props.eventKey].getDOMNode().clientWidth + 4;
              }
              else{
                return this.props.max_tab_width;
              }
            }, this));
          var total_width = _.reduce(tab_widths, function(s, t){ return s+t}, 0);
          var tab_count = this.props.children.length;
          visible = tab_count;
          while(visible > 0 && total_width > width){
              visible--;
              total_width -= tab_widths[visible];
          }
        }
      this.setState({visible_tabs: visible});
    }
  },
  countTabs: function(){
    return this.props.children.length;
  },
  handlePaneAnimateOutEnd: function () {
    this.setState({
      previousActiveKey: null
    });
  },

  renderTabs: function(children){
      function renderTabIfSet(child) {
          return child.props.tab != null ? this.renderTab(child) : null;
      }
      return _.map(children, renderTabIfSet, this);
  },
  renderDrops: function(children, label, classes){
      function renderDropIfSet(child) {
          return child.props.tab != null ? this.renderDrop(child) : null;
      }
      return <DropdownButton  className={"btn-group drops "+(classes||'')} title={label} key="drops">
                  {_.map(children, renderDropIfSet, this)}
                </DropdownButton>

    },

  renderNav: function(){
    var visible_tabs = this.state.visible_tabs || this.props.children.length;
    var activeKey = this.getActiveKey();
    var tabs = [], drops = [];
    if(this.props.dropdownOnly){
      drops = this.props.children;
    }
    else if(this.props.tabsOnly){
      tabs = this.props.children;
    }
    else{
      tabs = this.props.children.slice(0, this.state.visible_tabs);
      drops = this.props.children.slice(this.state.visible_tabs);
    }
    if(tabs.length){
      return  (React.createElement(Nav, React.__spread({},  this.props, {activeKey: activeKey, onSelect: this.handleSelect, ref: "tabs"}),
          this.renderTabs(tabs), drops.length ? this.renderDrops(drops, 'More Tabs...', 'pull-right') : null))
    }
    else{
      return (<ul className="nav nav-tabs nav-dropdown" ref="tabs">
            { this.renderDrops(drops, this.getActiveLabel()) }
          </ul>)
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
    // Ugly ontouchstart here, need to replace navitem
    return <NavItem ref={'tab' + key} key={key} className="tab" eventKey={key} onTouchStart={this.handleSelect.bind(this, key)}>
              <span className="tab-title">
              {child.props.tab}
          </span>
          { this.props.onClose ? <span className="tab-close" onClick={this.handleClose.bind(this, key)}>&times;</span> : null }
        </NavItem>
  },

  renderDrop: function (child) {
    var key = child.props.eventKey;
    return <MenuItem ref={'tab' + key} eventKey={key} key={key} onSelect={this.handleSelect.bind(this, key)}>
            <span className="tab-title">
              {child.props.tab}
            </span>
            { this.props.onClose ? <span className="tab-close" onClick={this.handleClose.bind(this, key)}>&times;</span> : null }
          </MenuItem>
  },

  shouldComponentUpdate: function(nextProps, nextState) {
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