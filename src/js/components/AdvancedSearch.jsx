"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var Col = require('react-bootstrap/lib/Col');
var Button = require('react-bootstrap/lib/Button');
var ButtonToolbar = require('react-bootstrap/lib/ButtonToolbar');
var SplitButton = require('./SplitButton.jsx');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var strings = require('../strings');

var FormHelper = {
    getValue: function(){
        var value = {}, nest=this.nestValues
        _.each(this.refs, function(r, k){
            var gotValue = r.getValue ? r.getValue() : React.findDOMNode(r).value;
            if(_.isObject(gotValue) && !nest){
                _.extend(value, gotValue);
            }
            else{
                value[k] = gotValue;
            }
        });
        return _.pick(_.extend({}, this.state, value), _.identity);
    },
    componentWillReceiveProps: function(nextProps){
        if(nextProps.query){
            //this.setState(this.getStateFields())
        }
    },
    getFields: function(){
        // assumes this.props.query is a populated immutablejs object
        var fields = (this.states || []).concat(this.types || []).concat(this.filters || []);
        var all_null = _.object(_.map(fields, function(f){
            return [f, null];
        }));
        return _.extend(all_null, _.pick.apply(null, [this.props.query.toJS()].concat(this.stateFields)))
    }
};

var ToggleHelper =  {
    toggleAll: function(type, event){
        this.setState(_.object(_.map(this[type], function(s){
            return [s, event.target.checked];
        })));
    },
    renderCategoryLabel: function(category){
        if(this[category] && this[category].length){
            return <label className="control-label col-xs-4 col-sm-2"><span>{strings[category]}</span></label>
        }
        return null;
    },
    renderCategoryForm: function(category, className, toggleAll){
        if(this[category] && this[category].length){
            var all = _.every(_.pick.apply(null, [this.state].concat(this[category])))
            return <div className={className}>
                <Input type="checkbox" label={strings['all']} onChange={toggleAll} checked={all}/>
                  { this[category].map(function(field){
                    return <Input type="checkbox" label={strings[field]} key={field} ref={field} checkedLink={this.linkState(field)} />
                  }.bind(this)) }
            </div>
        }
        return null;
    },

};

var Contains = {
    handleContentType: function(key){
        this.setState({contains_type: key});
    },
    renderContains: function(){
        return <div className="form-group">
                <label className="control-label col-sm-2"><span>{strings.contains}</span></label>
                <div className="col-sm-10">
                    <span className="input-group">
                        <input className="form-control" type="text" ref="contains" valueLink={this.linkState('contains')}/>
                        <SplitButton bsStyle={'primary'} title={strings[this.state.contains_type]}  onSelect={this.handleContentType}>
                            <MenuItem eventKey={'all_words'}>{ strings.all_words }</MenuItem>
                            <MenuItem eventKey={'any_words'}>{ strings.any_words }</MenuItem>
                            <MenuItem eventKey={'exact'}>{ strings.exact }</MenuItem>
                        </SplitButton>
                    </span>
                    <span className="help-block" >For example: 'justice -prison'</span>
                 </div>
            </div>
        }
};

var CaseSearch = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin,
        FormHelper,
        ToggleHelper,
        Contains,
    ],
    fields: ['neutral_citation', 'courtfile', , 'year', 'court', 'bench', 'parties', 'matter', 'charge'],
    courts: ['supreme_court', 'appeal_court', 'high_court'],
    getInitialState: function(){
        this.stateFields = this.fields.concat(this.courts);
        return this.props.query ? this.getFields() : {contains_type: 'all_words', 'supreme_court': true, 'appeal_court': true, 'high_court': true};
    },
    toggleAllCourt: function(event){
        this.setState(_.object(_.map(this.courts, function(s){
            return [s, event.target.checked];
        })));
    },
    render: function(){
        return <form className="form-horizontal">
                    <Input type="text" label={strings.full_citation} valueLink={this.linkState('full_citation')} ref="full_citation" labelClassName="col-sm-2" wrapperClassName="col-sm-10" />
                    { this.renderContains() }
                    { this.fields.map(function(field){
                        return <Input type="text" label={strings[field]} key={field} ref={field} valueLink={this.linkState(field)} labelClassName="col-sm-2" wrapperClassName="col-sm-10" help="" />
                    }, this) }
                    <div className='form-group'>
                        { this.renderCategoryLabel('courts',"col-xs-4") }
                        { this.renderCategoryForm('courts', "col-xs-4", this.toggleAllCourt) }
                    </div>
                </form>
        }
});

var RenderSubInstrument = {
    initialCheckboxState: function(activeList, fullList){
        var out = {};
        _.each(fullList, function(label) {
            out[label] = activeList.indexOf(label) != -1;
        });
        return out;
    },
    render: function(){
        return  <div className="form-group">
                { this.renderCategoryLabel('types') }
                { this.renderCategoryForm('types', this.typesClass || "col-sm-4 col-xs-8", this.toggleAll.bind(this, 'type')) }
                { this.renderCategoryLabel('status') }
                { this.renderCategoryForm('status', this.statusClass || "col-sm-4 col-xs-8", this.toggleAll.bind(this, 'status')) }
                { this.renderCategoryLabel('filters') }
                { this.renderCategoryForm('filters', this.filterClass || "col-sm-4 col-xs-8", this.toggleAll.bind(this, 'filters')) }
                </div>
    }
}


var LegislationSearch = React.createClass({
    types: [],
    filters: [
    'principal_acts',
    'legislative_instruments',
    'amendment_acts',
    'bills_and_sops',
    'include_repealed',
    'not_yet_in_force'],
    mixins: [
        React.addons.LinkedStateMixin,
        ToggleHelper,
        RenderSubInstrument,
        FormHelper
    ],
    getInitialState: function(){
        return  this.props.query ? this.getFields() : this.initialCheckboxState(
            ['principal_acts', 'legislative_instruments'],
            [].concat(this.types, this.status, this.filters)
        );
    }
})


var InstrumentSearch= React.createClass({
    mixins:[
        FormHelper,
        React.addons.LinkedStateMixin,
        Contains
    ],
    stateFields: ['contains_type', 'contains', 'title', 'year', 'definition', 'legislation_types'],

    getInitialState: function(){
        return this.props.query ?
            this.getFields() : {contains_type: 'all_words'};
    },

    render: function(){
        return <div><form className="form-horizontal">
              <Input type="text" label={strings.title} ref="title" valueLink={this.linkState('title')} labelClassName="col-sm-2" wrapperClassName="col-sm-10" />
              { this.renderContains() }

                <Input type="text" label={strings.definitions} ref="definition" valueLink={this.linkState('definition')} labelClassName="col-sm-2" wrapperClassName="col-sm-10" />
                <Input type="text" label={strings.year} ref="year" valueLink={this.linkState('year')} labelClassName="col-sm-2" wrapperClassName="col-sm-10" help="For example: '1993', or '1991-2001'" />
                 <hr/>
               <LegislationSearch ref="leg_search"/>
            </form>
            </div>

    }
});


module.exports = React.createClass({
    mixins:[
        FormHelper
    ],
    propTypes: {
        view: React.PropTypes.object.isRequired
    },
    stateFields: ['doc_type'],
    getInitialState: function(){
        // if coming from basic search, doc_type might be 'all'.
        var state = this.props.query ? this.getFields() : { doc_type: 'instruments'};
        if(state.doc_type !== 'instruments' && state.doc_type !== 'cases'){
            state.doc_type = 'instruments';
        }
        return state;
    },
    handleType: function(doc_type){
        this.setState({doc_type: doc_type});
    },
    search: function(){
        var title = 'Advanced Search';
        var query = _.extend({search: 'advanced'}, _.pick(this.getValue(), _.identity));
        Actions.replacePage(this.props.page_id, {
            query: query,
            title: title,
            page_type: 'search'
        });
        Actions.toggleAdvanced(this.props.viewer_id, this.props.page_id)
    },
    shouldComponentUpdate: function(nextProps, nextState){
        return this.state.doc_type !== nextState.doc_type || this.props.query !== nextProps.query || this.props.view !== nextProps.view;
    },
    onKeyDown: function(event){
        if (event.key === 'Enter'){
            this.search();
        }
    },
    renderStub: function(){
        return <div className="">
                <div className="toggle-row">
                    <a role="button"  onClick={Actions.toggleAdvanced.bind(null, this.props.viewer_id, this.props.page_id)}>Advanced Search</a>
                </div>
            </div>
    },
    renderForm: function(){
        return <div className="" onKeyDown={this.onKeyDown}>
            {/* <form className="form-horizontal">
                <div className="form-group">
                    <label className="control-label col-sm-2"><span>Query Type</span></label>
                    <div className="col-sm-10">
                        <label className="radio-inline">
                            <input type="radio" name="type" value="instruments" checked={ this.state.doc_type === 'instruments'} onChange={this.handleType.bind(this, 'instruments')}/>
                            Legislation
                        </label>
                        <label className="radio-inline">
                        <input type="radio" label="Cases" name="type" value="cases" checked={ this.state.doc_type === 'cases'} onChange={this.handleType.bind(this, 'cases')}/>
                            Cases
                        </label>
                    </div>
                </div>
            </form> */ }
            { this.state.doc_type === 'instruments' ?
                    <InstrumentSearch ref="sub" query={this.props.query && this.props.query.get('doc_type') === 'instruments' ? this.props.query : null}/> :
                    <CaseSearch ref="sub" query={this.props.query && this.props.query.get('doc_type') === 'cases' ? this.props.query : null} /> }
                <ButtonToolbar>
                  {/*<Button bsStyle={'info'}>Filter Current Results</Button> TODO: Implement */}
                  <Button bsStyle={'primary'} onClick={this.search}>Search</Button>
                </ButtonToolbar>
                <div className="toggle-row">
                <a role="button" onClick={Actions.toggleAdvanced.bind(null, this.props.viewer_id, this.props.page_id)}>Hide Advanced Search</a>
                </div>
            </div>
    },
    render: function(){
        var show = this.props.view.getIn(['settings', this.props.page_id, 'advanced_search']);
        var className= "advanced-search";
        if(!show){
            className += " stub"
        }
        return <div className={className}>
            { show ? this.renderForm() : this.renderStub() }
        </div>
    }
})