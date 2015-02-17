"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Col = require('react-bootstrap/Col');
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
    'courtfile': 'Court File Number',
    'court': 'Court',
    'parties': 'Parties',
    'matter': 'Matter',
    'charge': 'Charge',
    'year': 'Year',
    'location': 'Location',
    'public': 'Public',
    'local': 'Local',
    'private': 'Private',
    'provincial': 'Provincial',
    'imperial': 'Imperial',

    'courts': 'Courts',
    'supreme_court': 'Supreme Court',
    'high_court': 'High Court',
    'appeal_court': 'Appeal Court',

    'all': 'All',
    'types': 'Type',
    'status': 'Status',


    'act_principal': 'Principal Acts in force',
    'act_not_in_force': 'Acts not yet in force',
    'act_amendment_in_force': 'Amendment Acts in force',
    'act_as_enacted': 'As-enacted Acts',
    'act_repealed': 'Repealed Acts',

    'current_bills': 'Current Bills',
    'enacted_bills': 'Enacted Bills',
    'terminated_bills': 'Terminated Bills',

    'bill_government': 'Government',
    'bill_local': 'Local',
    'bill_private': 'Private',
    'bill_members': 'Member\'s',

    'act_public': 'Public',
    'act_local': 'Local',
    'act_private': 'Private',
    'act_provincial': 'Provincial',
    'act_imperial': 'Imperial',

    'other_principal': 'Principal Legislative Instruments in force',
    'other_not_in_force': 'Legislative Instruments not yet in force',
    'other_amendment_force': 'Amendment Legislative Instruments in force',
    'other_as_made': 'As-made Legislative Instruments',
    'other_revoked': 'Revoked Legislative Instruments'
}

var FormHelper = {
    getValue: function(){
        var value = {}, nest=this.nestValues
        _.each(this.refs, function(r, k){
            if(_.isObject(r.getValue()) && !nest){
                _.extend(value, r.getValue());
            }
            else{
                value[k] = r.getValue();
            }
        })
        return _.pick(_.extend(value, this.state), _.identity);
    }
};
var ToggleHelper =  {
    toggleAllStatus: function(event){
        this.setState(_.object(_.map(this.status, function(s){
            return [s, event.target.checked];
        })));
    },
    toggleAllType: function(event){
        this.setState(_.object(_.map(this.types, function(s){
            return [s, event.target.checked];
        })));
    },
    renderCategoryLabel: function(category){
        if(this[category].length){
            return <label className="control-label col-xs-2"><span>{strings[category]}</span></label>
        }
        return null;
    },
    renderCategoryForm: function(category, toggleAll){
        if(this[category].length){
            return <div className="col-xs-4">
                <Input type="checkbox" label={strings['all']} onChange={toggleAll} />
                  { this[category].map(function(field){
                    return <Input type="checkbox" label={strings[field]} key={field} ref={field} checkedLink={this.linkState(field)} />
                  }.bind(this)) }
            </div>
        }
        return null;
    }
}

var CaseSearch = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin,
        FormHelper,
        ToggleHelper
    ],
    fields: ['neutral_citation', 'courtfile', , 'year', 'court', 'bench', 'parties', 'matter', 'charge'],
    courts: ['supreme_court', 'appeal_court', 'high_court'],
    getInitialState: function(){
        return {contains_type: 'all_words', 'supreme_court': true, 'appeal_court': true, 'high_court': true}
    },
    handleContentType: function(event){
        this.setState({contains_type: event.target.getAttribute('data-val')});
    },
    toggleAllCourt: function(event){
        this.setState(_.object(_.map(this.courts, function(s){
            return [s, event.target.checked];
        })));
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
              <div className='form-group'>
                { this.renderCategoryLabel('courts') }
                { this.renderCategoryForm('courts', this.toggleAllCourt) }
            </div>
        </form>
    }
});

var RenderSubInstrument = {
    render: function(){
         return  <div className="form-group">
                { this.renderCategoryLabel('types') }
                { this.renderCategoryForm('types', this.toggleAllType) }
                { this.renderCategoryLabel('status') }
                { this.renderCategoryForm('status', this.toggleAllStatus) }
                </div>
    }
}

var ActSearch = React.createClass({
    types: ['act_public', 'act_local', 'act_private', 'act_provincial', 'act_imperial'],
    status: ['act_principal', 'act_not_in_force', 'act_amendment_in_force', 'act_as_enacted', 'act_repealed'],
    mixins: [
        React.addons.LinkedStateMixin,
        ToggleHelper,
        RenderSubInstrument
    ],
    getInitialState: function(){
        return {'act_public': true, 'act_local': true,
                'act_private': true,'act_provincial': true, 'act_imperial': true,
                'act_principal': true, 'act_amendment_in_force': true}
    },

})

var BillSearch = React.createClass({
    types: ['bill_government', 'bill_local', 'bill_private', 'bill_members'],
    status: ['current_bills', 'enacted_bills', 'terminated_bills'],
    mixins: [
        React.addons.LinkedStateMixin,
        ToggleHelper,
        RenderSubInstrument
    ],
    getInitialState: function(){
        return {'act_public': true, 'act_local': true,
                'act_private': true,'act_provincial': true, 'act_imperial': true,
                'act_principal': true, 'act_amendment_in_force': true}
    }
})

var OtherSearch = React.createClass({
    types: [],
    status: ['other_principal', 'other_not_in_force', 'other_amendment_force','other_as_made', 'other_revoked'],
    mixins: [
        React.addons.LinkedStateMixin,
        ToggleHelper,
        RenderSubInstrument
    ],
    getInitialState: function(){
        return {'act_public': true, 'act_local': true,
                'act_private': true,'act_provincial': true, 'act_imperial': true,
                'act_principal': true, 'act_amendment_in_force': true}
    }
})

var InstrumentSearch = React.createClass({
    mixins:[
        FormHelper,
        React.addons.LinkedStateMixin
    ],
    getInitialState: function(){
        return {contains_type: 'all_words', acts: true, bills: false, other: false};
    },
    handleContentType: function(event){
        this.setState({contains_type: event.target.getAttribute('data-val')});
    },
    render: function(){
        return <div><form className="form-horizontal">
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
                       }  help="For example: 'justice -prison'" />

              <Input type="text" label={strings.year} ref="year" labelClassName="col-xs-2" wrapperClassName="col-xs-10" help="For example: '1993', or '1991-2001'" />
                 <hr/>
                <div className="form-group">
                    <label className="control-label col-xs-2"><span>Acts</span></label>
                    <div className="col-xs-4">
                        <Input type="checkbox" label=' '  checkedLink={this.linkState('acts')} />
                    </div>
                    </div>
                { this.state.acts ? <ActSearch /> : null }

                   <hr/>
                <div className="form-group">
                    <label className="control-label col-xs-2"><span>Bills</span></label>
                    <div className="col-xs-4">
                        <Input type="checkbox" label=' '  checkedLink={this.linkState('bills')} />
                    </div>
                    </div>
                { this.state.bills ? <BillSearch /> : null }

                   <hr/>
                <div className="form-group">
                    <label className="control-label col-xs-2"><span>Legislative Instruments</span></label>
                    <div className="col-xs-4">
                        <Input type="checkbox" label=' '  checkedLink={this.linkState('other')} />
                    </div>
                    </div>
                { this.state.other ? <OtherSearch /> : null }

            </form>
            </div>

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
        var query = _.extend({search: 'advanced'}, _.pick(this.getValue(), _.identity));
        Actions.newResult({query: query, title: title});
    },
    render: function(){
        return <div className="advanced-search">
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
    }
})