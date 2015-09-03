"use strict";

var React = require('react/addons');
var Banner = require('./Banner.jsx');
var ReactRouter = require('react-router');
var request = require('../catalex-request');
var $ = require('jquery');

module.exports = React.createClass({
    mixins: [ReactRouter.State],
    getInitialState: function() {
        return {
            isDragActive: false
        };
    },

    propTypes: {
    },
    componentDidMount: function(){
        $(document).on('keypress', function(e){
            if(e.keyCode === 32 && this._droppedFiles){
                this.post(this._droppedFiles)
            }
            e.preventDefault();
        }.bind(this));
    },
    onDragEnter: function(e) {
        e.preventDefault();

        this.setState({
            isDragActive: true
        });
    },

    onDragOver: function(e) {
        e.preventDefault();
    },

    onDragLeave: function(e) {
        e.preventDefault();

        this.setState({
            isDragActive: false
        });
    },

    onDrop: function(e) {
        e.preventDefault();
        this.setState({
            isDragActive: false
        });
        var droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        if(droppedFiles.length && droppedFiles[0].name){
            this._droppedFiles = droppedFiles;
            this.post(droppedFiles);
        }
    },
    post:function(droppedFiles){
        request.post('/case_preview')
            .attach('file', droppedFiles[0], droppedFiles[0].name)
            .promise()
            .then(function(result){
                this.setState({'error': null, 'html': result.text})
            }.bind(this))
            .catch(function(){
                this.setState({'error': 'Problem with file', 'html': null})
            }.bind(this))
            .done()
    },
    open: function() {
        var fileInput = React.findDOMNode(this.refs.fileInput);
        fileInput.value = null;
        fileInput.click();
    },
    render: function(){
      return <div className="browser"
        onDragEnter={this.onDragEnter}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDrop={this.onDrop}
        >
        <Banner>
        </Banner>
        <div className="results-container">
        <div className="text-center">Drag a Case PDF here</div>
        { this.state.error ? <div className="alert alert-danger" role="alert"><strong>Error</strong> {this.state.error}</div> : null }
        { this.state.html ? <div className="case"><div dangerouslySetInnerHTML={{__html: this.state.html}} ></div></div> : <div/> }
        </div>
      </div>
    }
});