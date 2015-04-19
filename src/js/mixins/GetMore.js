var React = require('react/addons');
var Actions = require('../actions/Actions');
var $ = require('jquery');
var _ = require('lodash');

module.exports = {
    componentDidMount: function(){ // Move to mixin
        var self = this;
        this._debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var $scroll = $(self.getScrollContainer());
                // TO DO, calculation returns true too early if advanced search is visible
                if(self.isMounted() && !self.props.page.get('finished') &&
                    !self.props.page.get('fetching') &&
                   $scroll[0].scrollHeight - $scroll[0].clientHeight  <= $scroll.scrollTop()) {
                    Actions.getMorePage(self.props.page.get('id'));
                }
            }
        }, 100);
        $(this.getScrollContainer()).on('scroll', this._debounce_scroll);
    },
    componentWillUnmount: function(){
        $(this.getScrollContainer()).off('scroll', this._debounce_scroll);
    }

}