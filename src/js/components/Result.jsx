"use strict";
var React = require('react');
var Reflux = require('reflux');
var Button = require('react-bootstrap/Button');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var Glyphicon = require('react-bootstrap/Glyphicon');
var Actions = require('../actions/Actions');
var _ = require('lodash');


var Result = React.createClass({
    getInitialState: function(){
        return {
            expanded: false,
            collapsed:false,
            showing_form: false,
        }
    },
    header: function(){
        return <div className="legislation-header">
        <Button className='menu' onClick={this.showForm}><Glyphicon glyph="list" /></Button>
        <h4>{this.props.data.title}</h4>
                    <ButtonToolbar>
                      <ButtonGroup>
                        <Button onClick={this.expand}><Glyphicon glyph="plus-sign" /></Button>
                        <Button onClick={this.collapse}><Glyphicon glyph="minus-sign" /></Button>
                        <Button onClick={this.close}><Glyphicon glyph="remove-sign" /></Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                </div>
    },
    showForm: function(){
        this.setState({showing_form: !this.state.showing_form})
    },
    expand: function(){
        this.setState({expanded: !this.state.expanded})
    },
    collapse: function(){
        this.setState({collapsed: !this.state.collapsed})
    },
    close: function(){
        Actions.removeResult(this.props.data);
    },
    form: function(){
        return <div className="legislation-result-form">
            "Will put subsearch in here"
        </div>
    },

    legislation: function(){
        var className = 'legislation-result';
        if(this.state.expanded){
            className += ' expanded';
        }
        if(this.state.collapsed){
            className += ' collapsed';
        }
        if(this.state.showing_form){
            className += ' showing-form';
        }                   
        return <div className={className}>
                {this.header()}
                {this.form()}
                 <div className="legislation-body" dangerouslySetInnerHTML={{__html: this.props.data.content.html_content }}/>
             </div>
    },
    render: function(){
    	if(this.props.data.content.html_content){
        	return this.legislation();
        }
        else{
            return <div/>
        }
    }
});

module.exports = Result;