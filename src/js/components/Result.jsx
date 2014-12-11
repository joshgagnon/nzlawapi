"use strict";
var React = require('react');
var Reflux = require('reflux');
var _ = require('lodash');


var Result = React.createClass({
    mixins: [
    ],
    getInitialState: function() {
        return null;
    },    
    render: function(){
    	console.log(this.props.data.content)
    	if(this.props.data.content.html_content){
    		
        	return <div className="legislation-result" dangerouslySetInnerHTML={{__html: this.props.data.content.html_content }}/>
        }
    }
});

module.exports = Result;