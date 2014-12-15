"use strict";
var React = require('react');
var Reflux = require('reflux');
var Button = require('react-bootstrap/Button');
var ButtonToolbar = require('react-bootstrap/ButtonToolbar');
var ButtonGroup = require('react-bootstrap/ButtonGroup');
var Glyphicon = require('react-bootstrap/Glyphicon');
var Actions = require('../actions/Actions');
var ResultForm = require('./ResultForm.jsx');
var findText = require('../util/findText.js');
var _ = require('lodash');
var $ = require('jquery');

var Result = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin
    ],    
    getInitialState: function(){
        return {
            expanded: false,
            collapsed:false,
            showing_form: false,
            history:false,
            search: ''
        }
    },
    componentDidMount: function(){
        $('[data-toggle="tooltip"]', this.getDOMNode()).tooltip();
    },
    header: function(){
        return <div className="legislation-header">
        <Button className='menu' onClick={this.showForm}><Glyphicon glyph="list" /></Button>
        <h4>{this.props.data.title}</h4>
            <ButtonToolbar>
              <ButtonGroup>
                <Button onClick={this.expand}><Glyphicon glyph="plus-sign" /></Button>
                <Button onClick={this.collapse}><Glyphicon glyph="minus-sign" /></Button>
                <Button onClick={this.close}><Glyphicon glyph="remove-sign" /></Button>
              </ButtonGroup>
            </ButtonToolbar>
        </div>
    },
    showForm: function(){
        this.setState({showing_form: !this.state.showing_form})
    },
    expand: function(){
        this.setState({expanded: !this.state.expanded})
    },
    collapse: function(){
        this.setState({collapsed: !this.state.collapsed})
    },
    close: function(){
        Actions.removeResult(this.props.data);
    },
    form: function(){
        return <ResultForm data={this.props} 
            toggleHistory={this.toggleHistory} history={this.state.history}
            toggleCrossref={this.toggleCrossref} crossref={this.state.crossref}
            toggleDefinitions={this.toggleDefinitions} definitions={this.state.definitions}
            toggleContext={this.toggleContext} context={this.state.context}
            updateSearch={this.updateSearch} search={this.state.search}/>
    },
    handleClick: function(e){
        var $target = $(e.target).closest('a');
        if(/\/act_search_id\/.*/.test($target.prop('href'))){
            e.preventDefault();
            this.fetch($target.prop('href'));
        }
    },
    fetch: function(url){
        $.get(url)
            .then(function(result){
                Actions.newResult({src: {url: url}, query: url, content: result})
            });
    },
    toggleHistory: function(){
        this.setState({history: !this.state.history});
    },
    toggleContext: function(){
        this.setState({context: !this.state.context});
    }, 
    toggleCrossref: function(){
        this.setState({crossref: !this.state.crossref});
    }, 
    toggleDefinitions: function(){
        this.setState({definitions: !this.state.definitions});
        $.get('/query', {
            type: this.props.data.content.type, 
            act_name: this.props.data.content.act_name, act_find: 'all_definitions', format: 'json'
            })
            .then(function(result){
                Actions.definitions(this.props.data.id, result.content)
            }.bind(this));
    },
    updateSearch: function(e){
        this.setState({search: $(e.target).val()})
    },
    highlight: function(){
        var str = this.props.data.content.html_content;
        if(this.state.search){
            var search = new RegExp(this.state.search, 'ig');
            var content = $('<div/>').append(str);
             findText(content.get(0), search, function(highlighted){
                var span = document.createElement('span');
                  span.className = 'mark';
                  span.appendChild(highlighted);
                  return span;
             });
            str = content.html();
        }
        return str;
    },
    legislation: function(){
        var className = 'legislation-result '+this.props.data.id;
        if(this.state.expanded){
            className += ' expanded';
        }
        if(this.state.collapsed){
            className += ' collapsed';
        }
        if(this.state.showing_form){
            className += ' showing-form';
        }  
         if(this.props.data.current){
            className += ' selected';
        } 
        if(this.state.history){
            className += ' history';
        } 
        if(this.state.context){
            className += ' context';
        } 
        if(this.state.crossrefs){
            className += ' crossrefs';
        }
         if(this.state.definitions){
            className += ' definitions';
        }       
        return <div className={className}>
                {this.header()}
                {this.form()}
                 <div onClick={this.handleClick} className="legislation-body" dangerouslySetInnerHTML={{__html: this.highlight(this.props.data.content.html_content) }}/>
             </div>
    },
    render: function(){
    	if(this.props.data.content.html_content){
        	return this.legislation();
        }
        else{
            return <div/>
        }
    }
});

module.exports = Result;