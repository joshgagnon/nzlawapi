"use strict";
var React = require('react/addons');
var Reflux = require('reflux');
var ArticleStore = require('../stores/ArticleStore');
var JumpTo = require('./JumpTo.jsx');
var Actions = require('../actions/Actions');
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [
      Reflux.listenTo(ArticleStore,"onPositionChange")
    ],

    onPositionChange: function(value){
        var self = this;
        var $el = $('.legislation-contents', this.getDOMNode());
        $el.find('.active').each(function(){
            $(this).removeClass('active');
        });
        this.active = [];
        var active = $el.find('[href=#'+value.id+']');
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

    },
    interceptLink: function(e){
        var link = $(e.target).closest('a');
        if(link.length){
            e.preventDefault();
            Actions.articleJumpTo(this.props.article, {id: link.attr('href'), noscroll: true});
        }
    },
    componentDidMount: function(){
        this.onPositionChange({});
    },
    stopPropagation: function(e){
        e.stopPropagation();
        var elem = $(this.getDOMNode()).find('.legislation-contents');
         if(e.deltaY < 0 && elem.scrollTop() == 0) {
                 e.preventDefault();
           }
         if(e.deltaY > 0 && elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
                 e.preventDefault();
           }

    },
    render: function(){
        return <div onClick={this.interceptLink} onWheel={this.stopPropagation} >
                <JumpTo article={this.props.article}/>
                <div className="legislation-contents" dangerouslySetInnerHTML={{__html:this.props.article.content.html_contents_page}}/>
            </div>
    }
});