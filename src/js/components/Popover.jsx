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

var DragDropMixin = require('react-dnd').DragDropMixin;
var DropEffects= require('react-dnd').DropEffects;


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
        }else if(this.props.popoverPage.get('type') === POPOVER_TYPES.DEFINITION){
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
            return <div className={classes}>
                    {fragment ? <DynamicArticleBreadCrumbs {...this.props} content={this.props.popoverPage} container={this}/> : null }
                    <div dangerouslySetInnerHTML={{__html: html}}  onClick={this.interceptLink}/>
                </div>
        }
        else{
            return <div className='csspinner traditional' />
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
        var type = this.props.popoverPage.get('type') === POPOVER_TYPES.DEFINITION ? PAGE_TYPES.DEFINITION : PAGE_TYPES.INSTRUMENT;
        var query = this.props.popoverPage.get('query');
        if(query && query.get('find') === 'preview'){
            query = query.toJS();
            query = _.extend({}, query, {find: 'full'});
        }
        Actions.newPage({
            title: this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title'),
            query_string: this.props.popoverPage.get('query_string'),
            query: query,
            page_type: type
        }, this.props.viewer_id)
    }
}

// USING PLAIN JS
module.exports = {
    Popover: React.createClass({
        mixins: [BootstrapMixin, PopoverBehaviour, ArticleHandlers, DragDropMixin, {stopScrollPropagation: utils.stopScrollPropagation}],
        topOffset: 20,
        openLinksInTabs: true,
        scrollable_selector: '.popover-content > *',
        statics: {
        configureDragDrop: function(register) {
          register(DRAG_TYPES.POPOVER, {
            dragSource: {
              beginDrag: function(component) {
                return {
                  effectAllowed: DropEffects.MOVE,
                  item: component.props
                };
              }
            }
          });
        }
      },
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
            var self = this, left=this.props.popoverView.get('left') , top=this.props.popoverView.get('top');
            var width = this.getDOMNode().clientWidth,
                container_width = this.props.getScrollContainer()[0].clientWidth;
            var change = false;
            if(left < 0){
                change = true;
                left = 0;
            }
            if(left + width > container_width){
                left = (left + width) - container_width;
                change = true;
            }
            if(top<0){
                top =  0;
                change = true;
            }
            if(change){
                Actions.popoverMove(this.props.viewer_id, this.props.page_id, {left: left,top: top, id: this.props.popoverPage.get('id')});
            }
        },

        close: function() {
             Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.popoverPage.get('id'));
        },
        render: function() {
            var measured = !!this.props.popoverView.get('top') || !!this.props.popoverView.get('left');
            var classes = 'popover cata-popover ' + this.state.placement;
            var style = {};
            style['left'] = this.props.popoverView.get('left');
            style['top'] = this.props.popoverView.get('top') + this.topOffset;
            style['display'] = measured ? 'block' : 'none';
            var arrowStyle = {};
            arrowStyle['left'] = this.props.popoverPage.get('arrowOffsetLeft');
            arrowStyle['top'] = this.props.popoverPage.get('arrowOffsetTop');
            return (
                <div className={classes} role="tooltip" style={style} >
                    { !this.props.popoverView.get('dragged') ? <div className="arrow"  style={arrowStyle} /> : null }
                    <h3 className="popover-title" {...this.dragSourceFor(DRAG_TYPES.POPOVER)}>{this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title')}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className='popover-content' onWheel={this.stopScrollPropagation} >
                        {this.renderBody() }
                    </div>
                    {this.renderFooter() }
                </div>
            );
          }
    }),
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
    })
};