"use strict";
var React = require('react/addons');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Alert = require('react-bootstrap/Alert');
var Modal = require('react-bootstrap/Modal');
var ModalTrigger = require('react-bootstrap/ModalTrigger');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var joinClasses = require('react-bootstrap/utils/joinClasses');
var classSet = require('react-bootstrap/utils/classSet');
var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ResultStore = require('../stores/ResultStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
require('bootstrap3-typeahead');
var TypeAhead = require('./TypeAhead.jsx'); 


var Intitular = React.createClass({
	render: function(){
		return <div dangerouslySetInnerHTML={{__html:this.props.html}}/>
	}
});

var FullCase = React.createClass({
	render: function(){
		return <iframe src={this.props.path}/>
	}
});

var ReportModal = React.createClass({

    getInitialState: function(){
    	return {}
    },
    preventSubmit: function(e){
    	e.preventDefault();
    },
    submit: function(e){
    	e.preventDefault();
    	this.props.submitReport();
    	this.props.onRequestHide();
    },
  render: function() {
    return (
        <Modal {...this.props} title="Report Error" animation={true}>
          <div className="modal-body">
          <p>Error in { this.props.full_citation }</p>
          <form className="form" onSubmit={this.preventSubmit}>
          <Input type="text" label="Reporter"  value={this.props.reporter} onChange={this.props.reporterChange} />
          <Input type="textarea" label="Details"  value={this.props.details} onChange={this.props.detailsChange}/>
          <Input type="select"  label='Problem Fields' value={this.props.fields} onChange={this.props.fieldsChange} multiple>
            <option value="full_citation">Full Citation</option>
            <option value="neutral_citation">Neutral Citation</option>
            <option value="court">Court</option>
            <option value="parties">Parties</option>
            <option value="counsel">Counsel</option>
            <option value="matter">Matter</option>
            <option value="charge">Charge</option>
            <option value="waistband">Waistband</option>
            <option value="bench">Bench</option>
            <option value="appeal_result">Appeal Result</option>
        </Input>
          </form>
              </div>
	          <div className="modal-footer">
	            <Button onClick={this.props.onRequestHide}>Cancel</Button>
	            <Button  className="submit" bsStyle="danger" onClick={this.submit}>Submit</Button>
	          </div>
      
        </Modal>
      );
  }
});

var UserModal = React.createClass({
    preventSubmit: function(e){
        e.preventDefault();
    },    
      render: function() {
        return (
            <Modal {...this.props} title="User Name" animation={true}>
              <div className="modal-body">
              <form className="form" onSubmit={this.preventSubmit}>
              <Input type="text" label="Reporter"  value={this.props.reporter} onChange={this.props.reporterChange} />
              </form>
                  </div>
                  <div className="modal-footer">
                    <Button onClick={this.props.onRequestHide}>Close</Button>
                  </div>
          
            </Modal>
          );
      }
})



var ShowReports = React.createClass({
	render: function(){
		return <Modal {...this.props} title="Error Reports" animation={true}>
		    <div className="modal-body">
		    <table className="table">
		    <tr><th>Reporter</th><th>Fields</th><th>Details</th></tr>
			{ this.props.reports.map(function(report){
				return <tr><td>{report.reporter}</td><td>{(report.fields||[]).join(', ')}</td><td>{report.details}</td></tr>
			}) }
			</table>
		</div>
	          <div className="modal-footer">
	            <Button onClick={this.props.onRequestHide}>Close</Button>
	          </div>		
		</Modal>
	}
})

module.exports = React.createClass({
	mixins: [
        React.addons.LinkedStateMixin,
    ],
    getInitialState: function(){
    	return {
    		cases_typeahead: [],
    		case_name: '',
    		index: 0,
    		reporter: localStorage ? localStorage['reporter'] : '',
    		fields: []
    	}
    },
    componentDidMount: function(){
        $.get('/cases.json')
            .then(function(data){
            	var cases = data.cases.map(function(x){ return x[0]; });
                this.setState({cases_typeahead: cases, case_name: cases[0]}, this.fetch);
            }.bind(this));
        if(!this.state.reporter){
            this.refs.name_modal.toggle();
        }       
    },
    submit: function(e){
    	e.preventDefault();
    	var index = this.state.cases_typeahead.indexOf(this.state.case_name);
    	this.fetch();
    },
    next: function(){
    	var idx = (this.state.index+1) % this.state.cases_typeahead.length;
    	this.setState({index: idx, case_name: this.state.cases_typeahead[idx]}, this.fetch);
    },
    prev: function(){
    	var idx = this.state.index-1
    	var n = this.state.cases_typeahead.length;
    	idx = ((idx%n)+n)%n;
    	this.setState({index: idx, case_name: this.state.cases_typeahead[idx]}, this.fetch);
    },    
    fetch: function(){
    	$.get('/query', {
    		type: 'case',
    		case_name: this.state.case_name
    	})
    		.then(function(response){
    			this.setState({case_html: response.html_content, 
    				path: response.path, id: response.id,
    				full_citation: response.full_citation,
    				details: '', fields: [], validated: response.validated,
                    index: this.state.cases_typeahead.indexOf(this.state.case_name)
    			},this.getReports);
    		}.bind(this))
    },
    getReports: function(){
    	$.get('/error_reports', {id: this.state.id})
    		.then(function(response){
    			this.setState({reports: response.results});
    		}.bind(this))
    },
    detailsChange: function(e){
    	this.setState({details: e.target.value});
    },
    fieldsChange: function(e){
    	this.setState({fields: _.compact(_.map(e.target.children, function(c){ return c.selected ? c.value :null }))});
    },	
    reporterChange: function(e){
    	this.setState({reporter: e.target.value}, function(){;
        	if(localStorage){
        		localStorage['reporter'] = this.state.reporter;
        	}
        }.bind(this));
    },
    handleValid: function(e){
    	this.setState({validated:e.target.checked}, function(){
    		$.post('/validate_case', {id: this.state.id, validated: this.state.validated, username: this.state.reporter})
    	}.bind(this))
    },
    submitReport: function(){
    	$.post('/error_reports', _.pick(this.state ,'id', 'reporter', 'details', 'fields'))
    		.then(this.getReports)
    },    	        	
	render: function(){
		return (<div className="validator">
					<nav className="navbar navbar-default navbar-fixed-top">
						<div className="container">
						
							<form className="form form-inline">
								<TypeAhead typeahead={this.state.cases_typeahead}  key="case_name" ref="case_name" name="case_name" label='Case' valueLink={this.linkState('case_name')} 
										buttonAfter={<Button type="submit" className="submit" bsStyle="primary" onClick={this.submit}>Search</Button>}/>
								<ButtonGroup>
									<Input type="checkbox" label="Reviewed" checked={this.state.validated} onChange={this.handleValid}/>
								</ButtonGroup>
							 	<ButtonGroup>
									<ModalTrigger modal={<ReportModal case_id={this.state.id} full_citation={this.state.full_citation} 
									details={this.state.details} detailsChange={this.detailsChange} 
									fields={_.isArray(this.state.fields) ? this.state.fields : [this.state.fields]} fieldsChange={this.fieldsChange} 
									reporter={this.state.reporter} reporterChange={this.reporterChange} 
									submitReport={this.submitReport}/>}>
										<Button bsStyle="danger" >Submit Report</Button>
									</ModalTrigger>

									{this.state.reports && this.state.reports.length ? <ModalTrigger modal={<ShowReports reports={this.state.reports}/>}>
							 			<Button bsStyle="info" >Existing Reports</Button>
							 		</ModalTrigger> : null}
							 	</ButtonGroup>
							 	<ButtonGroup>
								 	<Button onClick={this.prev}><span className="glyphicon glyphicon-chevron-left"></span></Button>
								 	<Button onClick={this.next}><span className="glyphicon glyphicon-chevron-right"></span></Button>
							 	</ButtonGroup>
                                <ButtonGroup>
                                    <ModalTrigger ref="name_modal" modal={<UserModal 
                                    reporter={this.state.reporter} reporterChange={this.reporterChange} />}>
                                        <Button bsStyle="info" >User Name</Button>
                                    </ModalTrigger> 
                                </ButtonGroup>                               
							</form>
						</div>
					</nav>
					<div className="container-fluid">	
						<div className="row results">
							<div className="col-lg-4 col extracted">
								<Intitular html={this.state.case_html}/>
							</div>
							<div className="col-lg-8 col rendered">
								<FullCase path={this.state.path}/>
							</div>
						</div>
					</div>
				</div>);
	}
});
