var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var $ = require('jquery');
require('bootstrap3-typeahead');


module.exports = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin,
    ],
    render: function(){
        return <Input type="text" ref="input" {...this.props} bsStyle={this.props.bsStyle} 
                name={this.props.name} label={this.props.label} valueLink={this.props.valueLink} hasFeedback={this.props.hasError} />
    },
    componentDidMount: function(){
        var self = this;
        var node = this.refs.input.refs.input.getDOMNode();
        var appendTo = undefined;
        if(!this.props.appendToSelf){
            appendTo = $('body')
        }
        $(node).typeahead({ 
            items: this.props.items || 10,
            source: this.props.typeahead,
            appendTo: appendTo,
            afterSelect: function(value){
                self.props.valueLink.requestChange(value);
                this.$element.parents('.form-group').next().find('input, select').focus();
            },
            scrollHeight: $(node).offset().top - $(node).position().top
        });        
    },
    componentWillReceiveProps: function(data){
        if(data.typeahead){
            var node = this.refs.input.refs.input.getDOMNode();
            $(node).typeahead("setSource", data.typeahead);            
        }
    },
    componentWillUnmount: function(){
        var node = this.refs.input.refs.input.getDOMNode();
        $(node).typeahead("destroy");
    },
    getValue: function(){
        return this.refs.input.getValue();
    }
})

