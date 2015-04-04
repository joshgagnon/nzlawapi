var _ = require('lodash');
var React = require('react/addons');
var Reflux = require('reflux');
var ContextMenuStore = require('../stores/ContextMenuStore.js');
var Immutable = require('immutable');
var Actions = require('../actions/Actions');
var FadeMixin = require('react-bootstrap/lib/FadeMixin');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var EventListener = require('react-bootstrap/lib/utils/EventListener');
var _  = require('lodash');


var ContextMenu = React.createClass({
    mixins:[
        PureRenderMixin,
        FadeMixin
    ],
    height: 160,

    handleDocumentClick: function(){
        Actions.contextMenuClosed();
    },
    bindRootCloseHandlers: function() {
        this.unbindRootCloseHandlers();
        this._onDocumentListeners =
            [EventListener.listen(document, 'click', this.handleDocumentClick),
            EventListener.listen(document, 'wheel', this.handleDocumentClick)]

    },
    unbindRootCloseHandlers: function() {
        if (this._onDocumentListeners) {
            _.map(this._onDocumentListeners, function(d){ d.remove()});
            this._onDocumentListeners = null;
        }
    },
    componentDidMount: function(){
        this.bindRootCloseHandlers();
    },
    componentDidUpdate: function(){
        this.bindRootCloseHandlers();
    },
    componentWillUnmount: function(){
        this.unbindRootCloseHandlers();
    },
    render: function(){
        return <div className="context-menu fade" style={this.props.context_menu.get('position').toJS()} >
            <ul><li><ul className="children">
            <li className="title"><span >{this.props.context_menu.getIn(['data', 'location', 'repr'])}</span></li>
            <li className="suboption">
                <a onClick={Actions.toggleUnderlines} >
                    <span className="fa fa-underline" title="Open In New Tab"/>
                    <span className="sublabel">Open In New Tab</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={Actions.toggleNotes} >
                    <span className="fa fa-file-text-o" title="Add To Print"/>
                    <span className="sublabel">Add To Print</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={Actions.toggleNotes} >
                    <span className="fa fa-file-text-o" title="Find References"/>
                    <span className="sublabel">Find References</span>
                </a>
            </li>
            </ul>
            </li></ul>
        </div>
    }
});

module.exports = React.createClass({
    mixins:[
        Reflux.listenTo(ContextMenuStore, 'onState'),
        PureRenderMixin,
    ],
    getInitialState: function(){
        return {};
    },
    onState: function(state){
        this.setState(state);
    },
    render: function(){
        return <div>
            { this.state.context_menu ? <ContextMenu context_menu={this.state.context_menu} container={this}/> : null }
            </div>

    }
});