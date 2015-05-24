"use strict"
;var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');
var Search = require('./Search.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var Case = require('./Case.jsx');
var Definition = require('./Definition.jsx');
var SectionSummary = require('./SectionSummary.jsx');
var SectionReferences = require('./SectionReferences.jsx');
var UnknownError = require('./Warnings.jsx').UnknownError;
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var DRAG_TYPES = require('../constants').DRAG_TYPES;
var DragDropMixin = require('react-dnd').DragDropMixin;

function makeDropTarget(context) {
  return {
    acceptDrop: function(component, item) {
      var delta = context.getCurrentOffsetDelta();
      var left = Math.round(item.popoverView.get('left')+ delta.x);
      var top = Math.round(item.popoverView.get('top') + delta.y);
      Actions.popoverMove(item.viewer_id, item.page_id, {dragged: true, left: left, top: top, id: item.popoverPage.get('id'), time: (new Date()).getTime()});
    }
  };
}


var LoadUnknown = React.createClass({
    request: function(){
        Actions.requestPage(this.props.page.get('id'));
    },
    componentDidMount: function(){
        this.request();
    },
    componentDidUpdate: function(){
        this.request();
    },
    render: function(){
        //TODO change class
        if(this.props.page.getIn(['content', 'error'])){
            return <div className="legislation-result"><UnknownError error={this.props.page.getIn(['content', 'error'])}/></div>
        }
        else {
            return <div className="legislation-result" ><div className="csspinner" /></div>
        }
    }
})

module.exports = React.createClass({
        mixins: [DragDropMixin],
    statics: {
    configureDragDrop: function(register, context) {
        register(DRAG_TYPES.POPOVER, {
            dropTarget: makeDropTarget(context)
          });
        }
    },
    handleTab: function(active){
        Actions.showPage(this.props.viewer_id, active);
    },
    closeTab: function(id){
        Actions.removePage(id);
    },
    shouldComponentUpdate: function(newProps, newState){
        // browser changes layout, which tabs need to collapse properly
        return newProps.view.get('active_page_id') &&
            (this.props.view !== newProps.view ||
            this.props.pages !== newProps.pages ||
            this.props.browser !== newProps.browser );
    },
    modalVisible: function(){
        var active = this.props.view.get('active_page_id');
        return !!this.props.view.getIn(['section_summaries', active]);
    },
    renderPage: function(page, extra_props){
        var props = {
            key: page.get('id'),
            page: page,
            viewer_id: this.props.viewer_id,
            view: this.props.view,
            closeView: this.closeView
        };
        var result;
        switch(page.get('page_type')){
            case(PAGE_TYPES.SEARCH):
                result = <Search {...props}/>
                break;
            case(PAGE_TYPES.INSTRUMENT):
                result = <Article {...props} />
                break;
            case(PAGE_TYPES.CASE):
                result = <Case {...props} />
                break;
            case(PAGE_TYPES.DEFINITION):
                result = <Definition {...props} />
                break;
             case(PAGE_TYPES.SECTION_REFERENCES):
                result = <SectionReferences {...props} />
                break;
            default:
                result = <LoadUnknown {...props} />;
        }
        return result;
    },
    closeView: function(){
        Actions.closeView(this.props.viewer_id);
    },
    renderTabs: function(){
        var self = this;
        return  <TabbedArea activeKey={this.props.view.get('active_page_id')}
                onSelect={this.handleTab}
                onClose={this.closeTab}
                viewer_id={this.props.viewer_id}
                showCloseView={this.props.showCloseView }
                closeView={this.closeView } >
                { this.props.pages.map(function(page){
                        return !page.get('print_only') ?
                             <TabPane key={page.get('id')} eventKey={page.get('id')} tab={page.get('full_title') || page.get('title')} >
                                { this.renderPage(page) }
                            </TabPane> : null
                      }, this).toJS() //can remove in react 0.13
            }
            </TabbedArea>
    },
    renderModals: function(){
        var active = this.props.view.get('active_page_id');
        var page = this.props.pages.find(function(p){
            return p.get('id') === active ;
        })
        return <SectionSummary
                sectionData={page.get('section_data')}
                sectionView={this.props.view.getIn(['section_summaries', active])}
                viewer_id={this.props.viewer_id}
                page_id={active} />;
    },
    render: function(){
        var classes = "results-container ";
        if(this.modalVisible()){
            classes += 'showing-modal ';
        }
        if(this.props.pages.size >= 2){
            return <div className={classes} {...this.dropTargetFor(DRAG_TYPES.POPOVER)}>
                { this.modalVisible() ? this.renderModals() : null }
                { this.renderTabs() }
            </div>

        }
        else if(this.props.pages.size === 1){
            var page = this.props.pages.get(0);
            return <div className={classes} {...this.dropTargetFor(DRAG_TYPES.POPOVER)}>
                { this.modalVisible() ? this.renderModals() : null }
                 { this.props.showCloseView ?
                    <div className="view-control">
                        <button onClick={Actions.closeView.bind(null, this.props.viewer_id)} className="btn btn-default">&times;</button>
                    </div> : null }
                 <div className="results-scroll">
                    {  this.renderPage(page) }
                </div>
                </div>
        }
        else{
            return <div className="results-empty"/>
        }
    }

});