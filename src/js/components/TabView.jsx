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
var DropTarget = require('react-dnd').DropTarget;
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
//var DragDropMixin = require('react-dnd').DragDropMixin;


var target = {
  drop: function (props, monitor) {
    return monitor.getDifferenceFromInitialOffset();
  },
  canDrop: function(props, monitor){
    return monitor.getItem().viewer_id === props.viewer_id;
  }
};

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}

var WelcomePage = React.createClass({
    handleTourStart: function(e){
        e.preventDefault();
        Actions.tourStart();
    },
    render: function(){
        return <div className="legislation-result text-center">
        <h3>Welcome to CataLex Law Browser</h3>
        <br/>
        <p>To find a specific piece of legislation or search for a keyword, start typing in the search field above.</p>
        <p>Learn about the other features of Law Browser by taking the tour <a href="#" onClick={this.handleTourStart}>here</a>.</p>
        <div className="products col-md-4 col-md-offset-4">
        <h4>Other CataLex Services</h4>
        <a href="https://users.catalex.nz/good-companies-login" className="section">
            <span className="with-icon">
                <i className="fa fa-briefcase"></i>

                <span className="title">
                    <span className="main-title">Good Companies</span>
                    <span className="sub-title">Maintain legally compliant companies</span>
                </span>
            </span>
        </a>

        <a href="https://users.catalex.nz/sign-login" className="section">
                <span className="with-icon">
                    <i className="fa fa-pencil" aria-hidden="true"></i>

                    <span className="title">
                        <span className="main-title">CataLex Sign</span>
                        <span className="sub-title">Sign legal documents online</span>
                    </span>
                </span>
            </a>

        <a href="http://workingdays.catalex.nz/" className="section">
            <span className="with-icon">
                <i className="fa fa-calendar"></i>

                <span className="title">
                    <span className="main-title">Working Days</span>
                    <span className="sub-title">Calculate legal deadlines</span>
                </span>
            </span>
        </a>

        <a href="https://concat.catalex.nz/" className="section">
            <span className="with-icon">
                <i className="fa fa-copy"></i>

                <span className="title">
                    <span className="main-title">ConCat</span>
                    <span className="sub-title">Combine PDF documents</span>
                </span>
            </span>
        </a>
        </div>


        </div>
    }
})


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

var TabView = React.createClass({
    mixins: [PureRenderMixin],
    handleTab: function(active){
        Actions.showPage(this.props.viewer_id, active);
    },
    closeTab: function(id){
        Actions.removePage(id);
    },
    /*shouldComponentUpdate: function(newProps, newState){
        // browser changes layout, which tabs need to collapse properly
        return (this.props.view !== newProps.view ||
            this.props.pages !== newProps.pages ||
            this.props.browser !== newProps.browser );
    },*/
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
                          }, this).toJS()
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
    renderInner: function(){
        var classes = "results-container ";
        if(this.modalVisible()){
            classes += 'showing-modal ';
        }
        if(this.props.pages.size >= 2){
            return <div className={classes} >
                { this.modalVisible() ? this.renderModals() : null }
                { this.renderTabs() }
            </div>

        }
        else if(this.props.pages.size === 1){
            var page = this.props.pages.get(0);
            return <div className={classes} >
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
            return <div className={classes} ><WelcomePage /></div>
        }
    },
    render: function(){
        return this.props.connectDropTarget(this.renderInner());
    }

});

module.exports = DropTarget(DRAG_TYPES.POPOVER, target, collect)(TabView);