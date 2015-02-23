"use strict"
var React = require('react/addons');
var Button = require('react-bootstrap/Button');
var Reflux = require('reflux');
var Input = require('react-bootstrap/Input');
var Modal = require('react-bootstrap/Modal');
var Actions = require('../actions/Actions.js');
var SavedStates = require('../stores/SavedStates.js');

var SaveMixin = {
    getInitialState: function(){
        return {saved_views: [], value: ''}
    },
    componentDidMount: function(){
        Actions.fetchSavedStates();
    },
    onSavedStates: function(data){
        this.setState(data);
    },
    selectExisting: function(value){
        this.setState({value: value});
    },
    render: function(){
        return   <div className="static-modal">
      <Modal title={this.title}
            onRequestHide={this.closeAction}
        >
        <div className="modal-body">
         {this.save_mode ?  <form className="form-horizontal">
            <Input type="text" label="Name" ref="name" valueLink={this.linkState('value')} labelClassName="col-xs-2" wrapperClassName="col-xs-10"/>
          </form> : null}
          <div className="saved_list">
              <table className="table table-striped">
              <thead>
              <tr><th>Label</th><th colSpan="2">Date</th></tr>
              </thead>
              <tbody>
              { this.state.saved_views.map(function(v, i){
                var className = '';
                if(v.name === this.state.value){
                    className += 'success';
                }
                return <tr onClick={this.selectExisting.bind(this, v.name)} key={i} className={className}>
                    <td>{v.name}</td>
                    <td>{v.date}</td><
                    td><span className="close" data-val={v.name} onClick={this.removeSavedState}>×</span></td></tr>
              }.bind(this))}
              </tbody></table>
          </div>
        </div>
        <div className="modal-footer">
          <Button onClick={this.closeAction}>Close</Button>
          <Button onClick={this.submit} bsStyle="primary">{this.submit_text}</Button>
        </div>
      </Modal>
    </div>
    },
    removeSavedState: function(e){
        e.stopPropagation();
        var value = e.target.getAttribute('data-val');
        Actions.removeSavedState(value);
    }

};

module.exports = {
    Save: React.createClass({
        mixins: [
          Reflux.listenTo(SavedStates,"onSavedStates"),
          React.addons.LinkedStateMixin,
          SaveMixin
        ],
        title: 'Save Session',
        save_mode: true,
        submit_text: 'Save',
        closeAction: Actions.closeSaveDialog,
        submit: function(){
            if(this.state.value.length){
                Actions.saveState(this.state.value);
                this.closeAction();
            }
        }
    }),
    Load: React.createClass({
        mixins: [
          Reflux.listenTo(SavedStates,"onSavedStates"),
          React.addons.LinkedStateMixin,
          SaveMixin
        ],
        closeAction: Actions.closeLoadDialog,
        title: 'Load Session',
        submit_text: 'Load',
        submit: function(){
            if(this.state.value.length){
                Actions.loadState(this.state.value);
                this.closeAction();
            }
        }
    })

};