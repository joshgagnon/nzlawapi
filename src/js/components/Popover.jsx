"use strict";
var React = require('react/addons');
var Col = require('react-bootstrap/Col');
var BootstrapMixin = require('react-bootstrap/BootstrapMixin');
var Button = require('react-bootstrap/Button');
var Actions = require('../actions/Actions');
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [BootstrapMixin],
    topOffset: 20,
    getInitialState: function() {
        return {
            placement: 'bottom'
        };
    },
    componentDidMount: function(){
        if(!this.props.fetched){
            Actions.requestPopoverData(this.props.page, this.props.id);
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
         Actions.popoverClosed(this.props.viewer_id, this.props.page, this.props.id);
    },
    scrollTo: function() {
         Actions.popoverClosed(this.props.viewer_id, this.props.page, this.props.id);
    },
    render: function() {
        var classes = 'popover def-popover ' + this.state.placement;
        var contentClasses = 'popover-content'
        var style = {};
        style['left'] = this.props.positionLeft;
        style['top'] = this.props.positionTop + this.topOffset;
        style['display'] = 'block';

        var arrowStyle = {};
        arrowStyle['left'] = this.props.arrowOffsetLeft;
        arrowStyle['top'] = this.props.arrowOffsetTop;

        var html = '';
        if (this.props.target && $('#' + this.props.target)[0]) {
            html = $('#' + this.props.target)[0].outerHTML;
        }
        else if(this.props.html){
            html = this.props.html;
        }
        else if(this.props.fetch){
            contentClasses += ' csspinner traditional loading';
        }
        return (
            <div className={classes} role="tooltip" style={style}>
                <div className="arrow"  style={arrowStyle}></div>
                <h3 className="popover-title">{this.props.title}</h3>
                <div className="popover-close" onClick={this.close}>&times;</div>
                <div className={contentClasses}>
                    <div className='legislation' dangerouslySetInnerHTML={{__html: html}} />
                </div>
                <div className="popover-footer">
                <div className="row">


                    <Button onClick={this.scrollTo}>Scroll To</Button >


                    <Button  onClick={this.open}>Open</Button >

                </div>
                </div>
            </div>
        );
      }
});