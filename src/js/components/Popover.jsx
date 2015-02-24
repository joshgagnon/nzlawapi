"use strict";
var React = require('react/addons');
var Col = require('react-bootstrap/lib/Col');
var BootstrapMixin = require('react-bootstrap/lib/BootstrapMixin');
var Button = require('react-bootstrap/lib/Button');
var Actions = require('../actions/Actions');
var ArticleSummary = require('./ArticleSummary.jsx');
var $ = require('jquery');

var PopoverBehaviour = {

        needFetch: function(){
            return !this.getLocalContent() && this.props.fetch
        },
         renderFooter: function(){
            if(this.props.type !== 'definition'){
                return <div className="popover-footer">
                        <div className="row">
                            { this.getLocalContent()?<Button onClick={this.scrollTo}>Scroll To</Button >:null}
                            <Button  onClick={this.open}>Open</Button >
                        </div>
                    </div>
            }
        },
        getLocalContent: function(){
            if (this.props.target && $('#' + this.props.target)[0]) {
                return true;
            }
        },
        renderBody: function(){
            var html;
            if(this.props.summary){
                return <ArticleSummary summary={this.props.attributes} />
            }
            if (this.getLocalContent()) {
                html = $('#' + this.props.target)[0].outerHTML;
            }
            else if(this.props.html){
                html = this.props.html;
            }
            if(html){
                return <div className='legislation' dangerouslySetInnerHTML={{__html: html}} />
            }
        },
        scrollTo: function() {
             Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.id);
        },
        open: function(){
            Actions.newPage(this.props,this.props.viewer_id)
        },
}


module.exports = {
    Popover: React.createClass({
        mixins: [BootstrapMixin, PopoverBehaviour],
        topOffset: 20,
        getInitialState: function() {
            return {
                placement: 'bottom'
            };
        },
        componentDidMount: function(){
            if(!this.getLocalContent() && !this.props.fetched){
                Actions.requestPopoverData(this.props.page_id, this.props.id);
            }
            this.reposition();  
        },
        componentDidUpdate: function() {
            this.reposition();
        },
        reposition: function(){
            var self = this;
            var $el = $(this.getDOMNode());
            var $target = $(this.props.source_sel);
            //TODO use bootstrap layout algorithm
            var left = this.props.positionLeft - ($el.outerWidth() / 2);
            $el.css({left:  Math.max(0, left)});

        },
        close: function() {
             Actions.popoverClosed(this.props.viewer_id, this.props.page_id, this.props.id);
        },
        render: function() {
            var classes = 'popover cata-popover ' + this.state.placement;
            var style = {};
            style['left'] = this.props.positionLeft;
            style['top'] = this.props.positionTop + this.topOffset;
            style['display'] = 'block';

            var arrowStyle = {};
            arrowStyle['left'] = this.props.arrowOffsetLeft;
            arrowStyle['top'] = this.props.arrowOffsetTop;

            return (
                <div className={classes} role="tooltip" style={style}>
                    <div className="arrow"  style={arrowStyle}></div>
                    <h3 className="popover-title">{this.props.title}</h3>
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
        mixins: [PopoverBehaviour],
        componentDidMount: function(){
            if(!this.getLocalContent() && !this.props.fetched){
                Actions.requestPopoverData(this.props.page_id, this.props.id);
            }
        },
        close: function() {
             this.props.closeAll();
        },
        render: function(){
            var classes = 'cata-popover';
            return <div className={classes}>
                    <h3 className="popover-title">{this.props.title}</h3>
                    <div className="popover-close" onClick={this.close}>&times;</div>
                    <div className={this.needFetch() ? 'popover-content csspinner traditional loading' : 'popover-content'}>
                        {this.renderBody() }
                        {this.renderFooter() }
                    </div>
                </div>
        }
    })
};