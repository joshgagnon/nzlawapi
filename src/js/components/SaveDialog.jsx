"use strict"
var React = require('react/addons');
var Button = require('react-bootstrap/lib/Button');
var Reflux = require('reflux');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var Actions = require('../actions/Actions.js');
var SavedStates = require('../stores/SavedStates.js');
var _= require('lodash');


var CreateFolder = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin,
    ],
    getInitialState: function(){
        return {value: this.props.value || '' }
    },
    submit: function(){
        if(this.state.value){
            this.props.submit(this.state.value);
        }
    },
    onKeyDown: function(e){
        if(e.key === 'Enter'){
            e.preventDefault();
            this.submit();
        }
    },
    render: function(){
        return   <div className="static-modal">
      <Modal title={this.props.title}
            onRequestHide={this.props.close}
        >
        <div className="modal-body">
         <form className="form-horizontal">
            <Input type="text" label={this.props.fieldname} ref="name"
                onKeyDown={this.onKeyDown}
                valueLink={this.linkState('value')}
                labelClassName="col-xs-3" wrapperClassName="col-xs-9"/>
          </form>
        </div>
        <div className="modal-footer">
          <Button onClick={this.props.close}>Cancel</Button>
          <Button onClick={this.submit} bsStyle="primary">{this.props.title}</Button>
        </div>
      </Modal>
    </div>
    }
});

var SaveMixin = {
    getInitialState: function(){
        return {saved_views: {children: []}, value: '', create_folder: false, rename: false, path: []}
    },
    componentDidMount: function(){
        Actions.fetchSavedStates();
    },
    onSavedStates: function(data){
        this.setState(data);
    },
    selectExisting: function(path, value){
        this.setState({value: value, path: path});
    },
    selectFolder: function(path){
        if(_.isEqual(path, this.state.path)){
            path = path.slice(0, path.length-1);
        }
        this.setState({path: path});
    },
    handleFolder: function(){
      this.setState({create_folder: !this.state.create_folder});
    },
    closeFolder: function(){
      this.setState({create_folder: false});
    },
    handleRename: function(){
      this.setState({rename: !this.state.rename});
    },
    closeRename: function(){
      this.setState({rename: false});
    },
    exists: function(path, value){
        var current = this.state.saved_views;
        _.each(path, function(p){
            current = _.find(current.children, {name: p});
        }, this);
        return !!_.find(current.children, {name: value});
    },
    getSelected: function(){
        var current = this.state.saved_views;
        _.each(this.state.path, function(p){
            current = _.find(current.children, {name: p});
        }, this);
        return current && _.find(current.children, {name: this.state.value}) || current;
    },
    createFolder: function(value){
        if(value && !this.exists(this.state.path, value)){
            Actions.createSaveFolder(this.state.path.concat([value]));
        }
        this.closeFolder();
    },
    rename: function(value){
        var sel = this.getSelected();
        var path = this.state.path
        if(sel.type !== 'folder'){
            path = path.concat([this.state.value]);
        }
        Actions.renameSavedState(path, value);
        this.closeRename();
    },
    onKeyDown: function(e){
        if(e.key === 'Enter'){
            e.preventDefault();
            this.submit();
        }
    },
    isParent: function(path1, path2){
        return _.startsWith(path1.join('/')+'/', path2.join('/')+'/');
    },
    renderTree: function(children, path, result){
        result = result || [];
        path = path || [];
        _.each(children, function(v, i){
            var offset = _.map(_.range(path.length), function(){ return '\u00a0\u00a0 ';}).join('');
            if(v.type === 'folder'){
                var folderClass = 'folder';
                var folder_selected = false;
                var folder_path = path.concat([v.name])
                if(this.isParent(this.state.path, folder_path)){
                    folderClass += ' success';
                    folder_selected = true;
                }
                result.push(<tr key={path.join('/')+i}  className={ folderClass } onClick={this.selectFolder.bind(this, folder_path)} >
                <td>{ offset }{v.name}</td>
                <td></td>
                <td><span className="close" data-val={v.name} onClick={Actions.removeSaveFolder.bind(null, folder_path)}>×</span></td>
                </tr>)
                if(folder_selected){
                  this.renderTree(v.children, path.concat(v.name), result);
                }
            }
            else{
                var stateClass = '';
                if(this.state.value === v.name && this.isParent(path, this.state.path)){
                    stateClass += ' success';
                }
                result.push(<tr onClick={this.selectExisting.bind(this, path, v.name)} key={path.join('/')+i} className={stateClass}>
                        <td>{ offset }{v.name}</td>
                        <td>{v.date}</td>
                        <td><span className="close"  onClick={Actions.removeSavedState.bind(null, path.concat([v.name]))}>×</span></td></tr>)
            }
        }, this);
        return result;
    },
    render: function(){
        var selected = this.getSelected();
        if(this.state.rename){
            return <CreateFolder  title="Rename" fieldname='Name' close={this.closeRename} submit={this.rename} value={selected.name}/>
        }
        else if(this.state.create_folder){
            return <CreateFolder title="Create Folder" fieldname='Folder Name' close={this.closeFolder} submit={this.createFolder}/>
        }
        else{
            return   <div className="static-modal save-dialog">
          <Modal title={this.title} onRequestHide={this.closeAction}>
            <div className="modal-body">
             {this.save_mode ?  <form className="form-horizontal">
                <Input type="text" label="Name" ref="name" onKeyDown={this.onKeyDown} valueLink={this.linkState('value')} labelClassName="col-xs-2" wrapperClassName="col-xs-10" onKeyP/>
              </form> : null}
              <div className="saved-list">
                  <table className="table table-striped">
                  <thead>
                  <tr><th>Label</th><th colSpan="2">Date</th></tr>
                  </thead>
                  <tbody>
                  { this.renderTree(this.state.saved_views.children) }
                  </tbody></table>
              </div>
            </div>
            <div className="modal-footer">
              { this.save_mode && selected !== this.state.saved_views ? <Button onClick={this.handleRename} className="rename" bsStyle="info">Rename</Button> : null}
              { this.save_mode ? <Button onClick={this.handleFolder}  className="create"  bsStyle="info">Create Folder</Button> : null}
              <Button onClick={this.closeAction}>Close</Button>
              {this.state.value ?
                <Button onClick={this.submit} bsStyle="primary" >{this.submit_text}</Button> :
                <Button sStyle="primary" disabled>{this.submit_text}</Button> }
            </div>
        </Modal>
      </div>
    }
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
            if(this.state.value){
                Actions.saveState(this.state.path.concat([this.state.value]));
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
            if(this.state.value){
                Actions.loadState(this.state.path.concat([this.state.value]));
                this.closeAction();
            }
        }
    })

};