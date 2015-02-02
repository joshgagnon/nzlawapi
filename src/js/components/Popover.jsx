"use strict";
var React = require('react/addons');
var Col = require('react-bootstrap/Col');
var BootstrapMixin = require('react-bootstrap/BootstrapMixin');
var Button = require('react-bootstrap/Button');
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [BootstrapMixin],
    getInitialState: function() {
        return {
            placement: 'bottom'
        };
    },
    componentDidMount: function() {
        var self = this;
        var $el = $(this.getDOMNode());
        var $target = $('[data-link-id=' + this.props.id + ']');
        //TODO use bootstrap layout algorithm
        $el.css({
                'left': '-=' + $el.outerWidth() / 2
            })
            //jQuery.fn.tooltip.Constructor.prototype.show.call(obj);
    },
    close: function() {
        this.props.onClose(this.props.id)
    },
    scrollTo: function() {
        this.props.jumpTo(this.props.id, '#' + this.props.target)
        this.props.onClose(this.props.id);
    },
    render: function() {
        var classes = 'popover def-popover ' + this.state.placement;
        var contentClasses = 'popover-content'
        var style = {};
        style['left'] = this.props.positionLeft;
        style['top'] = this.props.positionTop + 16;
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

                <Col md={6}>
                    <Button onClick={this.scrollTo}>Scroll To</Button >
                    </Col>
                <Col md={6}>
                    <Button  onClick={this.open}>Open</Button >
                </Col>
                </div>
                </div>
            </div>
        );
      }
});