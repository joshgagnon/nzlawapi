"use strict";
var React = require('react');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var Stores = require('../stores/Stores');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
require('bootstrap3-typeahead');


var TypeAhead = React.createClass({
    render: function(){
        return <Input type="text" ref="input" name={this.props.name} label={this.props.label} defaultValue={this.props.defaultValue} value={this.state} />
    },
    componentDidMount: function(){
        var node = this.refs.input.refs.input.getDOMNode();
        $.get('/acts.json')
            .then(function(data){
                $(node).typeahead({ 
                    items:10,  
                    source: data.acts.map(function(a){
                        return a[0];
                    }),
                    appendTo: $('body'),
                    afterSelect: function(){
                        this.$element.parents('.form-group').next().find('input, select').focus();
                    }
                });
            })
    },
    componentWillUnmount: function(){
        var node = this.refs.input.refs.input.getDOMNode();
        $(node).typeahead("destroy");
    },
    getValue: function(){
        return this.refs.input.getValue();
    }
})


var SearchForm = React.createClass({
    mixins: [
        Reflux.listenTo(Stores,"onChange")
    ],
    getInitialState: function() {
        return {type: 'act'};
    },    
    onChange: function(state){
        this.setState({type: state.type});
    },  
    handleTypeChange: function(evt){
        Actions.typeChange({type: evt.target.value});
    },
    handleQueryhange: function(evt){
        Actions.queryChange({query: evt.target.value});
    },    
    renderActFind: function(){
        return   <TypeAhead type="text" ref="act" name="act" label='Act' defaultValue="" value={this.state.act} />
    },
    renderSubActFind: function(){
        return <Input type="select" ref="act_find" label='Find' name="act_find" value={this.state.act_find} >
                    <option value="search">Search</option>
                    <option value="section">Section</option>
                    <option value="part">Part</option>
                    <option value="schedule">Schedule</option>
                    <option value="definitions">Definition</option>
                    <option value="full">Whole</option>
                </Input>
    },
    submit: function(){
        var data = _.object(_.map(this.refs, function(v, k){
            return [k, v.getValue()];
        }));

        Actions.resultRequest(data);
    },
    render: function(){
        var className = "form legislation-finder ";
        if(this.props.collapsable){
            className += 'hidden-xs';
        }
        if(this.state.loading){
            className += ' loading';
        }
        return <form className={className}>
                  <Input type="select" label='Type' ref="type" value={this.state.type} onChange={this.handleTypeChange}>
                    <option value="act">Acts & Regulations</option>
                    <option value="case">Court Cases</option>
                  </Input>
                  { this.state.type === 'act' ? this.renderActFind() : undefined }
                  { this.state.type === 'act' ? this.renderSubActFind() : undefined }

                  <Input type="text" ref="query" label='Query' defaultValue="" onChange={this.handleQueryChange} />
                 <ButtonToolbar>
                        <Button className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>
                        <Button className="submit_loading" bsStyle="info" id="submit-loading" >
                            <span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span>
                        </Button>
                  </ButtonToolbar>
            </form>
        }
});

module.exports = SearchForm;