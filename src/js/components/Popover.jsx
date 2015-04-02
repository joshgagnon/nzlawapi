"use strict";
var React = require('react/addons');
var Col = require('react-bootstrap/lib/Col');
var BootstrapMixin = require('react-bootstrap/lib/BootstrapMixin');
var Button = require('react-bootstrap/lib/Button');
var Actions = require('../actions/Actions');
var ArticleSummary = require('./ArticleSummary.jsx');
var ArticleHandlers= require('./ArticleHandlers.jsx');
var Warnings = require('./Warnings.jsx');
var $ = require('jquery');
var _ = require('lodash');



var PopoverBehaviour = {
    needFetch: function(){
        return !this.getLocalContent() && !this.props.popoverPage.get('fetched') && !this.props.popoverPage.get('error');
    },
    renderFooter: function(){
        if((this.props.popoverPage.get('type') === 'link' || this.props.popoverPage.get('type') === 'location')){
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
        }else if(this.props.popoverPage.get('type') === 'definition'){
            return <div className="popover-footer">
                    <div className="row">
                        <Button bsSize="small" bsStyle="primary" onClick={this.addToPrint}>Add To Print</Button >
                        <Button bsSize="small" bsStyle="primary"  onClick={this.open}>Open In New Tab</Button >
                    </div>
                </div>
        }
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
        if(this.props.popoverPage.get('error')){
            return <div ><Warnings.DefinitionError error={this.popoverPage.get('error')}/></div>
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
            return <div dangerouslySetInnerHTML={{__html: html}}  onClick={this.interceptLink}/>
        }
        else{
            return <div className='csspinner traditional'  />
        }
    },
    addToPrint: function(){
        Actions.addToPrint({
            title: this.props.popoverPage.get('title'),
            full_title: this.props.popoverPage.get('full_title'),
            query_string: this.props.popoverPage.get('url'),
            query: this.props.popoverPage.get('query'),
            html: this.props.popoverPage.get('html')
        });
    },
    scrollTo: function() {
         Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.popoverPage.get('id'));
    },
    open: function(){
        var query = this.props.popoverPage.get('query')
        if(query && query.find === 'preview'){
            query = _.extend({}, query, {find: 'full'});
        }
        Actions.newPage({
            title: this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title'),
            query_string: this.props.popoverPage.get('url'),
            query: query
        }, this.props.popoverPage.get('viewer_id'))
    }
}

// USING PLAIN JS
module.exports = {
    Popover: React.createClass({
        mixins: [BootstrapMixin, PopoverBehaviour, ArticleHandlers],
        topOffset: 20,
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
            this.reposition();
        },
        reposition: function(){
            var self = this;
            var $el = $(this.getDOMNode());
            var $target = $(this.props.popoverPage.get('source_sel'));
            //TODO use bootstrap layout algorithm
            var left = this.props.popoverPage.get('positionLeft') - ($el.outerWidth() / 2);
            $el.css({left:  Math.max(0, left)});

        },
        close: function() {
             Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.popoverPage.get('id'));
        },
        render: function() {
            var measured = !!this.props.popoverPage.get('positionTop') || !!this.props.popoverPage.get('positionLeft');
            var classes = 'popover cata-popover ' + this.state.placement;
            var style = {};
            style['left'] = this.props.popoverPage.get('positionLeft');
            style['top'] = this.props.popoverPage.get('positionTop') + this.topOffset;
            style['display'] = measured ? 'block' : 'none';
            var arrowStyle = {};
            arrowStyle['left'] = this.props.popoverPage.get('arrowOffsetLeft');
            arrowStyle['top'] = this.props.popoverPage.get('arrowOffsetTop');
            return (
                <div className={classes} role="tooltip" style={style}>
                    <div className="arrow"  style={arrowStyle}></div>
                    <h3 className="popover-title">{this.props.popoverPage.get('full_title') || this.props.popoverPage.get('title')}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className={this.needFetch() ? 'popover-content csspinner traditional loading' : 'popover-content'}>
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
        close: function() {
             this.props.closeAll();
        },
        render: function(){
            var classes = 'cata-popover';
            return <div className={classes}>
                    <h3 className="popover-title">{this.props.popoverPage.get('title')}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className={this.needFetch() ? 'popover-content csspinner traditional loading' : 'popover-content'}>
                        {this.renderBody() }
                        { this.renderFooter() }
                    </div>
                </div>
        }
    })
};