"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
require('bootstrap3-typeahead');


var TypeAhead = React.createClass({
    render: function(){
        return <Input type="text" ref="input" name={this.props.name} label={this.props.label} defaultValue={this.props.value} />
    },
    componentDidMount: function(){
        var node = this.refs.input.refs.input.getDOMNode();
        //todo, cache, prevent after unmount
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


var InputFactory = function(name, label){
    return function(link){
        return <Input type="text" key={name} ref={name} label={label} valueLink={link(name)}/>
    }
}


var Inputs = {
    query: InputFactory('query', 'Query'),
    search: InputFactory('search', 'Contains'),
    section: InputFactory('section', 'Section'),
    part: InputFactory('part', 'Part'),
    schedule: InputFactory('schedule', 'Schedule'),
    definitions: InputFactory('definitions', 'Definitions'),
    contains: InputFactory('contains', 'Search Within'),
    paragraph: InputFactory('paragraph', 'Paragraph'),

    case_query: InputFactory('case_query', 'Search Front Pages'),
    neutral_citation: InputFactory('neutral_citation', 'Neutral Citation'),
    court: InputFactory('court', 'Court'),
    parties: InputFactory('parties', 'Parties'),
    matter: InputFactory('matter', 'Matter'),
    charge: InputFactory('charge', 'Charge'),
    bench: InputFactory('bench', 'Bench'),


    acts_find: function(link){
        return <Input type="select" key="acts_find" ref="acts_find" label='Find' name="acts_find" valueLink={link('acts_find')} >
            <option value="contains">Search</option>
            <option value="definitions">Definition</option>
        </Input>
    },
    act_find: function(link){
        return <Input type="select" key="act_find" ref="act_find" label='Find' name="act_find" valueLink={link('act_find')}>
                <option value="search">Contains</option>
                <option value="section">Section</option>
                <option value="part">Part</option>
                <option value="schedule">Schedule</option>
                <option value="definitions">Definition</option>
                <option value="full">Whole Document</option>
            </Input>
    },
    act_name: function(link){
        return <TypeAhead type="text" key="act_name" ref="act_name" name="act_name" label='Act' valueLink={link('act_name')}/>
    },
    case_name: function(link){
        return <TypeAhead type="text" key="case_name" ref="case_name" name="case_name" label='Case' valueLink={link('case_name')}/>
    },    
    case_find: function(link){
        return <Input type="select" key="case_find" ref="case_find" label='Find' name="case_find" valueLink={link('case_find')} >
            <option value="contains">Search Within</option>
            <option value="paragraph">Paragraph</option>
            <option value="full">Whole Document</option>
        </Input>
    },
    cases_find: function(link){
        return <Input type="select" key="case_find" ref="case_find" label='Find' name="case_find" valueLink={link('case_find')} >
            <option value="case_query">Search Front Pages</option>
            <option value="neutral_citation">Neutral Citation</option>
            <option value="court">Court</option>
            <option value="parties">Parties</option>
            <option value="counsel">Counsel</option>
            <option value="matter">Matter</option>
            <option value="charge">Charge</option>
            <option value="bench">Bench</option>
        </Input>
    },   
}


var SearchForm = React.createClass({
    mixins: [
        Reflux.listenTo(FormStore,"onChange"),
        React.addons.LinkedStateMixin,
    ],
    getInitialState: function() {
        this.count = 0;
        return _.defaults(this.props.initialForm, 
            {type: 'act', act_find: 'search', acts_find: 'contains', case_find: 'contains', cases_find: 'case_query'
        });
    },    
    onChange: function(state){
        this.setState({type: state.type});
    },  
    handleFieldChange: function(evt){
        Actions.queryChange({type: evt.target.value});
    },   
    optionalInputs: function(){
        // todo, DRY
        var comps = [];
        if(this.state.type === 'act'){
            comps.push(Inputs['act_name'](this.linkState));
            comps.push(Inputs['act_find'](this.linkState));
            if(Inputs[this.state.act_find]){
                comps.push(Inputs[this.state.act_find](this.linkState));               
            }
        }
        if(this.state.type === 'acts'){
            comps.push(Inputs['acts_find'](this.linkState));
            if(Inputs[this.state.acts_find]){
                comps.push(Inputs[this.state.acts_find](this.linkState));               
            }
        }
        if(this.state.type === 'case'){
            comps.push(Inputs['case_name'](this.linkState));
            comps.push(Inputs['case_find'](this.linkState));
            if(Inputs[this.state.case_find]){
                comps.push(Inputs[this.state.case_find](this.linkState));               
            }
        } 
        if(this.state.type === 'cases'){
            comps.push(Inputs['cases_find'](this.linkState));
            if(Inputs[this.state.cases_find]){
                comps.push(Inputs[this.state.cases_find](this.linkState));               
            }
        }              
        return comps
    },
    submit: function(){
        var data = _.object(_.map(this.refs, function(v, k){
            return [k, v.getValue()];
        }));
        this.setState({loading: true})
        $.get('/query', data)
            .then(function(){
                Actions.newResult({id: this.count++, content: result})
            }.bind(this))
            .always(function(){
                this.setState({loading: false})
            }.bind(this))
        
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
                  <Input type="select" label='Type' ref="type"  valueLink={this.linkState('type')}>
                    <option value="act">Act or Regulation</option>
                    <option value="acts">All Acts & Regulations</option>
                    <option value="case">Court Case</option>
                    <option value="cases">All Court Cases</option>
                  </Input>
                  { this.optionalInputs() }
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