"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var JumpTo = require('./JumpTo.jsx');
var Actions = require('../actions/Actions');
var $ = require('jquery');
var utils = require('../utils');

module.exports = React.createClass({
    mixins: [
      utils.stopScrollPropagation
    ],
    propTypes: {
       article: React.PropTypes.object.isRequired,
    },
    scrollable_selector: '.legislation-contents',

    onPositionChange: function(value){
        var self = this;
        var $el = $('.legislation-contents', this.getDOMNode());
        $el.find('.active').each(function(){
            $(this).removeClass('active');
        });
        this.active = [];
        var active = $el.find('[href=#'+value.get('id')+']');
        if(active && active.parent().length){
            active  = active.parent();
            active.addClass('active');
            active.parentsUntil( '.contents', 'li').each(function(){
                $(this).addClass('active');
            });
            $el.scrollTop(active.offset().top -$el.offset().top - $el.height()/2 + $el.scrollTop());
        }else if($el.find('li:first').siblings().length === 0){
            $el.find('li:first').addClass('active')
        }
        this.refs.jumpTo.onPositionChange(value);

    },
    interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            Actions.articleJumpTo(this.props.viewer_id, {id: link.attr('href'), noscroll: true});
        }
    },
    componentDidMount: function(){
        if(this.props.position){
            this.onPositionChange(this.props.position);
        }
    },
    shouldComponentUpdate: function(nextProps){
        if(nextProps.article !== this.props.article){
            return true;
        }
        if(nextProps.position !== this.props.position){
            this.onPositionChange(nextProps.position);
        }
        return false;
    },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopScrollPropagation} >
                <JumpTo ref="jumpTo" position={this.props.position} viewer_id={this.props.viewer_id} />
                <div className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.article.getIn(['content','html_contents_page'])}}/>
            </div>
    }
});