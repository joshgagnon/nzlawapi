"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var TypeAhead = require('./TypeAhead.jsx');



var InputFactory = function(name, label){
    return function(link, error){
        return <Input type="text" bsStyle={error ? 'error': null} key={name} ref={name} label={label} valueLink={link(name)}  hasFeedback={!!error} />
    }
}


var Inputs = {
    query: InputFactory('query', 'Query'),
    search: InputFactory('query', 'Contains'),
    section: InputFactory('query', 'Section'),
    part: InputFactory('query', 'Part'),
    schedule: InputFactory('query', 'Schedule'),
    definitions: InputFactory('query', 'Definitions'),
    contains: InputFactory('query', 'Search Within'),
    paragraph: InputFactory('query', 'Paragraph'),

    case_query: InputFactory('query', 'Search Front Pages'),
    neutral_citation: InputFactory('query', 'Neutral Citation'),
    court: InputFactory('query', 'Court'),
    parties: InputFactory('query', 'Parties'),
    matter: InputFactory('query', 'Matter'),
    charge: InputFactory('query', 'Charge'),
    bench: InputFactory('query', 'Bench'),

    act_name: function(link, error, typeahead){
        return <TypeAhead type="text" bsStyle={error ? 'error': null}  hasError={!!error} typeahead={typeahead} key="act_name" ref="act_name" name="act_name" label='Act' valueLink={link('act_name')} />
    },
    case_name: function(link, error, typeahead){
        return <TypeAhead type="text" bsStyle={error ? 'error': null}  hasError={!!error} typeahead={typeahead}  key="case_name" ref="case_name" name="case_name" label='Case' valueLink={link('case_name')}  />
    },
    acts_find: function(link){
        return <Input type="select" key="acts_find" ref="find" label='Find' name="acts_find" valueLink={link('acts_find')} >
            <option value="contains">Search</option>
            <option value="definitions">Definition</option>
        </Input>
    },
    act_find: function(link){
        return <Input type="select" key="act_find" ref="find" label='Find' name="act_find" valueLink={link('act_find')}>
                <option value="search">Contains</option>
                <option value="section">Section</option>
                <option value="part">Part</option>
                <option value="schedule">Schedule</option>
                <option value="definitions">Definition</option>
                <option value="full">Whole Document</option>
            </Input>
    },
    case_find: function(link){
        return <Input type="select" key="case_find" ref="find" label='Find' name="case_find" valueLink={link('case_find')} >
            <option value="contains">Search Within</option>
            <option value="paragraph">Paragraph</option>
            <option value="full">Whole Document</option>
        </Input>
    },
    cases_find: function(link){
        return <Input type="select" key="case_find" ref="find" label='Find' name="case_find" valueLink={link('case_find')} >
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
        this.errors = {};
        return _.defaults(this.props.initialForm,
            {
            type: 'act', act_find: 'search', acts_find: 'contains', case_find: 'contains', cases_find: 'case_query',
            acts_typeahead: [], cases_typeahead: [],
            errors: {},
            error_message: null
        });
    },
    componentDidMount: function(){
        $.get('/acts.json')
            .then(function(data){
                this.setState({acts_typeahead: data.acts.map(function(x){ return x[0]; })});
            }.bind(this));
        $.get('/cases.json')
            .then(function(data){
                this.setState({cases_typeahead: data.cases.map(function(x){ return x[0]; })});
            }.bind(this));
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
            comps.push(Inputs['act_name'](
                this.linkState,
                this.state.errors['act_name'],
                this.state.acts_typeahead));
            comps.push(Inputs['act_find'](this.linkState));
            if(Inputs[this.state.act_find]){
                comps.push(Inputs[this.state.act_find](
                    this.linkState,
                    this.state.errors['query']
                    ));
            }
        }
        if(this.state.type === 'acts'){
            comps.push(Inputs['find'](this.linkState));
            if(Inputs[this.state.acts_find]){
                comps.push(Inputs[this.state.acts_find](this.linkState));
            }
        }
        if(this.state.type === 'case'){
            comps.push(Inputs['case_name'](
                this.linkState,
                this.state.errors['case_name'],
                this.state.cases_typeahead));
            comps.push(Inputs['case_find'](this.linkState));
            if(Inputs[this.state.case_find]){
                comps.push(Inputs[this.state.case_find](this.linkState,
                    this.state.errors['query']));
            }
        }
        if(this.state.type === 'cases'){
            comps.push(Inputs['cases_find'](this.linkState));
            if(Inputs[this.state.cases_find]){
                comps.push(Inputs[this.state.cases_find](
                    this.linkState,
                    this.state.errors['query']));
            }
        }
        return comps
    },

    renderError: function() {
        if (this.state.error_message){
            return ( <Alert bsStyle = "danger"
                onDismiss = {
                    this.handleAlertDismiss
                }>
               { this.state.error_message }
               </Alert>
            );
        }
    },

    submit: function(e){
        e.preventDefault();
        var data = _.object(_.map(this.refs, function(v, k){
            return [k, v.getValue()];
        }));
        // validation, for now, is easy:  field can't be empty
        var errors = {};
        _.each(data, function(v, k){
            if(!v) errors[k] = true;
        });
        this.setState({errors: errors, error_message: false});
        if(_.isEmpty(errors)){
            this.setState({loading: true});
            $.get('/query', data)
                .then(function(result){
                    Actions.newResult({query: JSON.stringify(data), src: {url: '/query', get: data}, content: result})
                }.bind(this),
                    function(result){
                        try{
                            this.setState({error_message: result.responseJSON.error});
                        }catch(e){
                           this.setState({error_message: 'Server Error'});
                        }
                    }.bind(this))
                .always(function(){
                    this.setState({loading: false})
                }.bind(this))
        }
    },

    render: function(){
        var className = "form legislation-finder ";
        if(this.props.collapsable){
            className += 'hidden-xs';
        }
        if(this.state.loading){
            className += ' loading';
        }
        return <form className={className} autoComplete="off">
                  <Input type="select" label='Type' ref="type"  valueLink={this.linkState('type')}>
                    <option value="act">Act or Regulation</option>
                    <option value="acts">All Acts & Regulations</option>
                    <option value="case">Court Case</option>
                    <option value="cases">All Court Cases</option>
                  </Input>
                  { this.optionalInputs() }
                  <div className="form-group">
                     <ButtonToolbar>
                            <Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>
                            <Button className="submit_loading" bsStyle="info" id="submit-loading" >
                                <span className="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span>
                            </Button>
                      </ButtonToolbar>
                  </div>
                  { this.renderError() }
            </form>
        }
});

module.exports = SearchForm;