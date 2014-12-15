"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var Reflux = require('reflux');


module.exports = React.createClass({
    handleKeyDown: function(e){
    	if(e.key==='Enter'){
    		e.preventDefault();
    		// do next or something
    	}
    },
    render: function(){
    	var className = 'legislation-result-form';
    	return <div className={className}>
	    	<form className="form form-inline" onKeyDown={this.handleKeyDown}>
	    		<div className="row">
	    		<div className="col-md-4">
	    		<Input type="text" label='Search' ref="search" value={this.props.search} onChange={this.props.updateSearch}/>
	    		</div>
	    			<div className="col-md-8">
	    		<ButtonGroup>
		    		<Button onClick={this.props.toggleDefinitions} className={this.props.definitions ? 'active': ''}>Definitions</Button>
		    		<Button onClick={this.props.toggleContext} className={this.props.context ? 'active': ''}>Context</Button>
		    		<Button onClick={this.props.toggleHistory} className={this.props.history ? 'active': ''}>History Notes</Button>
		    		<Button onClick={this.props.toggleCrossref} className={this.props.crossref ? 'active': ''}>Cross References</Button>
	    		</ButtonGroup>
	    		</div>
	    		</div>
	    	</form>
    	</div>
    }

});