"use strict";
var React = require('react/addons');
var Col = require('react-bootstrap/lib/Col');
var BootstrapMixin = require('react-bootstrap/lib/BootstrapMixin');
var Button = require('react-bootstrap/lib/Button');
var Actions = require('../actions/Actions');
var ArticleSummary = require('./ArticleSummary.jsx');
var ArticleHandlers= require('./ArticleHandlers.jsx');
var Warnings = require('./Warnings.jsx');
var PAGE_TYPES = require('../constants').PAGE_TYPES;
var POPOVER_TYPES = require('../constants').POPOVER_TYPES;
var DRAG_TYPES = require('../constants').DRAG_TYPES;
var DynamicArticleBreadCrumbs = require('./BreadCrumbs.jsx');
var utils = require('../utils');
var $ = require('jquery');
var _ = require('lodash');

var DropEffects= require('react-dnd').DropEffects;
var PopoverFix = require('../mixins/PopoverFix');

var DragSource = require('react-dnd').DragSource;

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  }
}

var popoverSource = {
  beginDrag: function (props) {
    return {'viewer_id': props.viewer_id, 'page_id': props.page_id,
    'id': props.popoverPage.get('id'), 'left': props.popoverView.get('left'),
    'top': props.popoverView.get('top')};
  },
  canDrag: function (props) {
    return true;
  },

  endDrag: function (props, monitor, component) {
    if (!monitor.didDrop()) {
      return;
    }

    var item = monitor.getItem();

    var dropResult = monitor.getDropResult();

    Actions.popoverMove(item.viewer_id, item.page_id,
        {dragged: true, left: dropResult.x + item.left, top: dropResult.y+item.top, id: item.id, time: (new Date()).getTime()});
  }
};

var PopoverBehaviour = {
    needFetch: function(){
        return !this.getLocalContent() && !this.props.popoverPage.get('fetched') && !this.props.popoverPage.get('error');
    },
    renderFooter: function(){
        if((this.props.popoverPage.get('type') === POPOVER_TYPES.LINK || this.props.popoverPage.get('type') === POPOVER_TYPES.LOCATION)){
            return <div className="popover-footer">
                    <div className="row">
                        { this.getLocalContent()?<Button bsSize="small" onClick={this.scrollTo}>Scroll To</Button >:null}
                        { this.props.popoverPage.get('format') === 'preview' ?
                            <Button bsSize="small" bsStyle="primary"  onClick={this.open}>Open Full Article New Tab</Button > :
                            <Button bsSize="small" bsStyle="primary"  onClick={this.open}>Open In New Tab</Button > }
                        { this.props.popoverPage.get('format') === 'fragment' ?
                            <Button bsSize="small" bsStyle="primary"  onClick={this.addToPrint}>Add To Print</Button > :
                            null }
                    </div>
                </div>
        }else if(this.props.popoverPage.get('type') === POPOVER_TYPES.DEFINITION || this.props.popoverPage.get('type') == POPOVER_TYPES.SECTION_REFERENCES){
            return <div className="popover-footer">
                    <div className="row">
                        <Button bsSize="small" bsStyle="primary" onClick={this.addToPrint}>Add To Print</Button >
                        <Button bsSize="small" bsStyle="primary"  onClick={this.open}>Open In New Tab</Button >
                    </div>
                </div>
        }
    },
    getScrollContainer: function(){
        return this.props.getScrollContainer();
    },
    overlayOffset: function(){
        return {left: this.props.popoverView.get('left'), top: this.props.popoverView.get('top') + 25}
    },
    getLocalContent: function(){
        return false;
        // can't work in skeleton, fragment mode
        /*if (this.props.popoverPage.get('target && $('#' + this.props.popoverPage.get('target)[0]) {
            return true;
        }*/
    },
    renderBody: function(){
        var html;
        var fragment = this.props.popoverPage.get('format') === 'fragment';
        if(this.props.popoverPage.get('error')){
            return <div ><Warnings.DefinitionError error={this.props.popoverPage.get('error')}/></div>
        }
        if(this.props.popoverPage.get('summary')){
            return <ArticleSummary summary={this.props.popoverPage.get('attributes')} />
        }
        if (this.getLocalContent()) {
            html = $('#' + this.props.popoverPage.get('target'))[0].outerHTML;
        }
        else if(this.props.popoverPage.get('html')){
            html = this.props.popoverPage.get('html');
        }
        else if(this.props.popoverPage.get('html_content')){
            html = this.props.popoverPage.get('html_content');
        }
        if(html){
            var classes = '';
            if(fragment){
                classes = 'fragment ';
            }
            return <div className={classes}   onClick={this.interceptLink}>
                    {fragment ? <DynamicArticleBreadCrumbs {...this.props} content={this.props.popoverPage} container={this} use_popover={true} /> : null }
                    <div dangerouslySetInnerHTML={{__html: html}}/>
                </div>
        }
        else{
            return <div><div className='csspinner traditional' /></div>;
        }
    },
    addToPrint: function(){
        Actions.addToPrint({
            title: this.props.popoverPage.get('title'),
            full_title: this.props.popoverPage.get('full_title'),
            query_string: this.props.popoverPage.get('query_string'),
            query: this.props.popoverPage.get('query'),
            html: this.props.popoverPage.get('html')
        });
    },
    scrollTo: function() {
         Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.popoverPage.get('id'));
    },
    open: function(){
        var type = PAGE_TYPES.INSTRUMENT;
        if(this.props.popoverPage.get('type') === POPOVER_TYPES.DEFINITION){
            type = PAGE_TYPES.DEFINITION;
        }
        else if(this.props.popoverPage.get('type') === POPOVER_TYPES.SECTION_REFERENCES){
            type = PAGE_TYPES.SECTION_REFERENCES;
        }
        var query = this.props.popoverPage.get('query');
        if(query){
            query = query.toJS();
        }
        if(query && query.find === 'preview'){
            query = _.extend({}, query, {find: 'full'});
        }
        Actions.newPage({
            title: this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title'),
            query_string: this.props.popoverPage.get('query_string'),
            query: query,
            page_type: type
        }, this.props.viewer_id)
    },
    getTitle: function(){
        return this.props.popoverPage.get('title');
    },
    getDocumentId: function(){
        return this.props.popoverPage.getIn(['query', 'document_id']);
    }
}

var Popover = React.createClass({
        mixins: [BootstrapMixin, PopoverBehaviour, ArticleHandlers, {stopScrollPropagation: utils.stopScrollPropagation}, PopoverFix],
        propTypes: {
            popoverView: React.PropTypes.object.isRequired,
            popoverPage: React.PropTypes.object.isRequired,
           // getScrollContainer: React.PropTypes.func.isRequired,
            connectDragSource: React.PropTypes.func.isRequired,
            isDragging: React.PropTypes.bool.isRequired,
            connectDragPreview: React.PropTypes.func.isRequired

        },
        topOffset: 20,
        openLinksInTabs: true,
        scrollable_selector: '.popover-content > *',
        getInitialState: function() {
            return {
                placement: 'bottom'
            };
        },
        componentDidMount: function(){
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
           this.reposition();  
        },
        componentDidUpdate: function() {
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
            this.reposition();
        },
        reposition: function(){
            // dumb, use boundingrectangle
            var self = this, left=this.props.popoverView.get('left') , top=this.props.popoverView.get('top');
            var width = this.getDOMNode().offsetWidth,
                container_width = this.props.getScrollContainer()[0].clientWidth;

            var change = false;
            var margin = 50;
            if(width + margin > container_width){
                left = margin;
                width = container_width - margin -4;
                change = true;
            }
            else if(left < margin){
                change = true;
                left = margin;
            }
            else if(left + width > container_width - margin){
                left = container_width - width -2;
                change = true;
            }

            if(top<0){
                top =  0;
                change = true;
            }
            if(change){
                Actions.popoverMove(this.props.viewer_id, this.props.page_id, {left: left,top: top, width: width, id: this.props.popoverPage.get('id')});
            }
        },

        close: function() {
             Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.popoverPage.get('id'));
        },
        render: function() {
            var isDragging = this.props.isDragging;

            var measured = !!this.props.popoverView.get('top') || !!this.props.popoverView.get('left');
            var classes = 'popover cata-popover ' + this.state.placement;
            var style = {};
            style['left'] = this.props.popoverView.get('left');
            style['top'] = this.props.popoverView.get('top') + this.topOffset;
            style['display'] = measured ? 'block' : 'none';
            if(this.props.popoverView.get('width')){
                style['width']  = this.props.popoverView.get('width');
                style['minWidth']  = this.props.popoverView.get('width');
            }
            var arrowStyle = {};
            arrowStyle['left'] = this.props.popoverPage.get('arrowOffsetLeft');
            arrowStyle['top'] = this.props.popoverPage.get('arrowOffsetTop');
             return this.props.connectDragPreview(<div className={classes} role="tooltip" style={style} >
                    { !this.props.popoverView.get('dragged') ? <div className="arrow"  style={arrowStyle} /> : null }
                    { this.props.connectDragSource(<h3 className="popover-title" >{this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title')}</h3>) }
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className='popover-content' onWheel={this.stopScrollPropagation} >
                        {this.renderBody() }
                    </div>
                    {this.renderFooter() }
                </div>);
          }
    });

// USING PLAIN JS
module.exports = {
    Popover: DragSource(DRAG_TYPES.POPOVER, popoverSource, collect)(Popover),

    MobilePopover:  React.createClass({
        mixins: [PopoverBehaviour, ArticleHandlers],
        componentDidMount: function(){
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
        },
        componentDidUpdate: function(){
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
        },
        close: function() {
             this.props.closeAll();
        },
        render: function(){
            var classes = 'cata-popover';
            return <div className={classes}>
                    <h3 className="popover-title">{this.props.popoverPage.get('title')}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className='popover-content'>
                        {this.renderBody() }
                    </div>
                    { this.renderFooter() }

                </div>
        }
    }),
    TabletPopover:  React.createClass({
        mixins: [PopoverBehaviour, ArticleHandlers],
        componentDidMount: function(){
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
        },
        componentDidUpdate: function(){
            if(!this.getLocalContent() && !this.props.popoverPage.get('fetched')){
                Actions.requestPopoverData(this.props.page_id, this.props.popoverPage.get('id'));
            }
        },
        close: function() {
            this.props.closeAll();
        },
        popoverStack: function(){
            return this.props.popoverView.get('stack') ? 0 : 1;
        },
        render: function(){
            var classes = 'cata-popover';
            return <div className={classes}>
                    <h3 className="popover-title">{this.props.popoverPage.get('title')}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className='popover-content'>
                        {this.renderBody() }
                    </div>
                    { this.renderFooter() }

                </div>
        }
    })
};