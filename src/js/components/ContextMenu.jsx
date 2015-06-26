var _ = require('lodash');
var React = require('react/addons');
var Reflux = require('reflux');
var ContextMenuStore = require('../stores/ContextMenuStore.js');
var Immutable = require('immutable');
var Actions = require('../actions/Actions');
var FadeMixin = require('react-bootstrap/lib/FadeMixin');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var EventListener = require('react-bootstrap/lib/utils/EventListener');
var POPOVER_TYPES = require('../constants').POPOVER_TYPES;
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
    newTab: function(){
        Actions.newPage({
            title: this.props.context_menu.getIn(['data', 'title']) + ' '+ this.props.context_menu.getIn(['data', 'location', 'repr']),
            query: this.props.context_menu.getIn(['data', 'query']).toJS()
        }, this.props.context_menu.get('viewer_id'));
    },
    addPrint: function(){
        Actions.addToPrint({
            title: this.props.context_menu.getIn(['data', 'title']) + ' '+ this.props.context_menu.getIn(['data', 'location', 'repr']),
            query: this.props.context_menu.getIn(['data', 'query']).toJS()
        });
    },
    findReferences: function(){
        Actions.popoverOpened(
            this.props.context_menu.get('viewer_id'),
            this.props.context_menu.get('page_id'), {
                id: this.props.context_menu.getIn(['data', 'id']),
                type: POPOVER_TYPES.SECTION_REFERENCES,
                title: this.props.context_menu.getIn(['data', 'title']) + ' '+ this.props.context_menu.getIn(['data', 'location', 'repr']),
                source_sel: this.props.context_menu.getIn(['data', 'source_sel']),
                fetched: false,
                left: this.props.context_menu.getIn(['data', 'left']),
                top: this.props.context_menu.getIn(['data', 'top']),
                query: {
                    document_id: this.props.context_menu.getIn(['data', 'query', 'document_id']),
                    find: 'section_references',
                    doc_type: 'instrument',
                    govt_ids: this.props.context_menu.getIn(['data', 'govt_ids']).toJS(),
                    target_path: this.props.context_menu.getIn(['data', 'target_path']),
                }
            });
    },
    findOtherVersions: function(){
        Actions.popoverOpened(
            this.props.context_menu.get('viewer_id'),
            this.props.context_menu.get('page_id'), {
                id: this.props.context_menu.getIn(['data', 'id']),
                type: POPOVER_TYPES.SECTION_VERSIONS,
                title: this.props.context_menu.getIn(['data', 'title']) + ' '+ this.props.context_menu.getIn(['data', 'location', 'repr']),
                source_sel: this.props.context_menu.getIn(['data', 'source_sel']),
                fetched: false,
                left: this.props.context_menu.getIn(['data', 'left']),
                top: this.props.context_menu.getIn(['data', 'top']),
                query: {
                    document_id: this.props.context_menu.getIn(['data', 'query', 'document_id']),
                    find: 'section_versions',
                    doc_type: 'instrument',
                    target_path: this.props.context_menu.getIn(['data', 'target_path']),
                }
            });
    },
    render: function(){
        var style = this.props.context_menu.get('position').toJS();
        return <div className="context-menu fade" style={style} >
            <ul><li><ul className="children">
            <li className="title"><span >{this.props.context_menu.getIn(['data', 'location', 'repr'])}</span></li>
            <li className="suboption">
                <a onClick={this.newTab} >
                    <span className="fa fa-file-o" title="Open In New Tab"/>
                    <span className="sublabel">Open In New Tab</span>
                </a>
            </li>
            <li className="suboption add-to-print">
                <a onClick={this.addPrint} >
                    <span className="fa fa-copy" title="Add To Print"/>
                    <span className="sublabel">Add To Print</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={this.findReferences} >
                    <span className="fa fa-search" title="Find References"/>
                    <span className="sublabel">Find References</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={this.findOtherVersions} >
                    <span className="fa fa-cubes" title="Other Versions"/>
                    <span className="sublabel">Other Versions</span>
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