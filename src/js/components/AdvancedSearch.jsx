"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var Actions = require('../actions/Actions');
var _ = require('lodash');

var strings ={
    'title': 'Title',
    'contains': 'Contains',
    'full_citation': 'Full Citation',
    'all_words': 'All Words',
    'any_words': 'Any Words',
    'exact': 'Exact',
    'bench': 'Bench',
    'neutral_citation': 'Neutral Citation',
    'court': 'Court',
    'parties': 'Parties',
    'matter': 'Matter',
    'charge': 'Charge',
    'year': 'Year',
    'location': 'Location'
}

var FormHelper = {
    getValue: function(){
        return _.pick(_.extend({}, this.state, _.object(_.map(this.refs, function(r, k){ return [k, r.getValue()]; }))), _.identity);
    }
};

var CaseSearch = React.createClass({
    fields: ['neutral_citation', 'court', 'bench', 'parties', 'matter', 'charge'],
    getInitialState: function(){
        return {contains_type: 'all_words'}
    },
    handleContentType: function(event){
        this.setState({contains_type: event.target.getAttribute('data-val')});
    },
    render: function(){
    return <form className="form-horizontal">
                    <Input type="text" label={strings.full_citation} ref="full_citation" labelClassName="col-xs-2" wrapperClassName="col-xs-10" />
                    <Input type="text" label={strings.contains} ref="contains" labelClassName="col-xs-2" wrapperClassName="col-xs-10"
                        buttonAfter={
                            <div className="btn-group">

                             <Button type="button" bsStyle="primary" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                               {strings[this.state.contains_type] } <span className="caret"></span>
                              <span className="sr-only">Toggle Dropdown</span>
                            </Button>
                            <ul className="dropdown-menu" role="menu" onClick={this.handleContentType}>
                                <li><a href="#" data-val={'all_words'}>{ strings.all_words }</a></li>
                                <li><a href="#" data-val={'any_words'}>{ strings.any_words }</a></li>
                                <li><a href="#" data-val={'exact'}>{ strings.exact }</a></li>
                              </ul>
                            </div>
                       } />
              { this.fields.map(function(field){
                return <Input type="text" label={strings[field]} key={field} ref={field} labelClassName="col-xs-2" wrapperClassName="col-xs-10" help="" />
              }) }

            </form>
    }
});


var InstrumentSearch = React.createClass({
    mixins:[
        FormHelper
    ],
    getInitialState: function(){
        return {contains_type: 'all_words'}
    },
    handleContentType: function(event){
        this.setState({contains_type: event.target.getAttribute('data-val')});
    },
    render: function(){
        return <form className="form-horizontal">
              <Input type="text" label={strings.title} ref="title" labelClassName="col-xs-2" wrapperClassName="col-xs-10" />
              <Input type="text" label={strings.contains} ref="contains" labelClassName="col-xs-2" wrapperClassName="col-xs-10"
                        buttonAfter={
                            <div className="btn-group">

                             <Button type="button" bsStyle="primary" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                               {strings[this.state.contains_type] } <span className="caret"></span>
                              <span className="sr-only">Toggle Dropdown</span>
                            </Button>
                            <ul className="dropdown-menu" role="menu" onClick={this.handleContentType}>
                                <li><a href="#" data-val={'all_words'}>{ strings.all_words }</a></li>
                                <li><a href="#" data-val={'any_words'}>{ strings.any_words }</a></li>
                                <li><a href="#" data-val={'exact'}>{ strings.exact }</a></li>
                              </ul>
                            </div>
                       } />
              <Input type="text" label={strings.year} ref="year" labelClassName="col-xs-2" wrapperClassName="col-xs-10" help="" />
              <Input type="text" label={strings.location} ref="location" labelClassName="col-xs-2" wrapperClassName="col-xs-10" help="" />
            </form>
    }
});


module.exports = React.createClass({
    mixins:[
        FormHelper
    ],
    getInitialState: function(){
        return {
            type: 'instruments',
        }
    },
    handleType: function(type){
        this.setState({type: type});
    },
    search: function(){
        var title = 'Advanced Search';
        var query = _.extend({advanced: true}, _.pick(this.getValue(), _.identity));
        Actions.newResult({query: query, title: title});
    },
    render: function(){
        console.log(this.state)
        return <div className="advanced-search">
            <div className="container">
            <form className="form-horizontal">
                <div className="form-group">
                    <label className="control-label col-xs-2"><span>Query Type</span></label>
                    <div className="col-xs-10">
                        <Input type="radio" label="Legislation" name="type" value="instruments" checked={ this.state.type === 'instruments'} onChange={this.handleType.bind(this, 'instruments')}/>
                        <Input type="radio" label="Cases" name="type" value="cases" checked={ this.state.type === 'cases'} onChange={this.handleType.bind(this, 'cases')}/>
                    </div>
                </div>
                </form>
            { this.state.type === 'instruments' ? <InstrumentSearch ref="sub" /> : <CaseSearch ref="sub"/> }
                <ButtonToolbar>
                  <Button bsStyle={'primary'} onClick={this.search}>Search</Button>
                  <Button bsStyle={'info'}>Filter Current Results</Button>
                </ButtonToolbar>
            </div>
        </div>
    }
})