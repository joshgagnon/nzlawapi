var React = require('react/addons');
var MQ = require('./Responsive.jsx');
var Actions = require('../actions/Actions');
var Popover = require('./Popover.jsx')
var _ = require('lodash');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var Popovers = React.createClass({
    mixins: [PureRenderMixin],
    render: function(){
        return <div>{ this.props.popoverView
                    .sort(function(a, b){ return (a.get('time')||0) - (b.get('time')||0)})
                    .map(function(view, key){
                var data = this.props.popoverData.get(key);
                return !data ? null : (<Popover.Popover placement="auto" viewer_id={this.props.viewer_id}
                    popoverPage={data} popoverView={view} page_id={this.props.page_id} id={key} key={key}
                    getScrollContainer={this.props.getScrollContainer}/>)
            }, this).toList()}</div>
    }
 });


var MobilePopovers = React.createClass({
    mixins: [PureRenderMixin],
    // Mobile only renders the last one

    closeAll: function(){
        this.props.popoverView.map(function(view, key){
            Actions.popoverClosed(this.props.viewer_id, this.props.page_id, key);
        }, this);
    },
    render: function(){
        var last = this.props.popoverView
                    .sort(function(a, b){ return (a.get('time')||0) - (b.get('time')||0)})
                    .keySeq().last();
        if(last !== undefined){
            var pop = this.props.popoverData.get(last)
            return <div className="mobile-popovers">
                    <Popover.MobilePopover popoverPage={pop} viewer_id={this.props.viewer_id}
                    popoverView={this.props.popoverView.get(last)}  page_id={this.props.page_id}
                    getScrollContainer={this.props.getScrollContainer} closeAll={this.closeAll}/>
                </div>
        }
        return <div/>
    }
});

var TabletPopovers = React.createClass({
    mixins: [PureRenderMixin],

    closeLeft: function(){
        this.props.popoverView.map(function(view, key){
            if(!view.get('stack')){
                console.log('left')
                Actions.popoverClosed(this.props.viewer_id, this.props.page_id, key);
            }
        },this);
    },
    closeRight: function(){
        console.log('close')
        this.props.popoverView.map(function(view, key){
            if(view.get('stack')){
                console.log('right')
                Actions.popoverClosed(this.props.viewer_id, this.props.page_id, key);
            }
        },this);
    },
    renderLeft: function(last){
        var pop = this.props.popoverData.get(last)
        return <div className="tablet-popovers left">
                    <Popover.TabletPopover popoverPage={pop} popoverView={this.props.popoverView.get(last)}
                    viewer_id={this.props.viewer_id} page_id={this.props.page_id}
                    getScrollContainer={this.props.getScrollContainer} closeAll={this.closeLeft}/>
                </div>
    },
    renderRight: function(last){
        var pop = this.props.popoverData.get(last)
        return <div className="tablet-popovers right">
                <Popover.TabletPopover popoverPage={pop} popoverView={this.props.popoverView.get(last)}
                viewer_id={this.props.viewer_id} page_id={this.props.page_id}
                getScrollContainer={this.props.getScrollContainer} closeAll={this.closeRight}/>
            </div>
    },
    render: function(){
        var last_left = this.props.popoverView
                    .filter(function(a){ return !a.get('stack') ; })
                    .sort(function(a, b){ return (a.get('time')||0) - (b.get('time')||0)})
                    .keySeq().last();
        var last_right = this.props.popoverView
                    .filter(function(a){ return a.get('stack') ; })
                    .sort(function(a, b){ return (a.get('time')||0) - (b.get('time')||0)})
                    .keySeq().last();

        return <div>
            { last_left ?  this.renderLeft(last_left) : null}
            { last_right ?  this.renderRight(last_right) : null}
            </div>
    }
});



module.exports = React.createClass({
    renderPopover: function(){
        var props = {
                popoverData: this.props.page.get('popovers'),
                popoverView: this.props.view.getIn(['popovers', this.props.page.get('id')]),
                viewer_id: this.props.viewer_id,
                getScrollContainer: this.props.getScrollContainer,
                page_id: this.props.page.get('id')};
         if(this.props.width && this.props.view.getIn(['popovers', this.props.page.get('id')])){
            console.log(this.props.width)
            if(this.props.width < 600){
                return <MobilePopovers {...props}/>
            }
            else if(this.props.width < 900){
                return <TabletPopovers {...props}/>
            }
            else{
                return <Popovers {...props}/>
            }
         }
    },
    render: function(){
        return <div>
            { this.renderPopover() }
            </div>

    }
});