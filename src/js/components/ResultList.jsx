"use strict";
var React = require('react');
var Reflux = require('reflux');
var ResultStore = require('../stores/ResultStore');
var Result = require('./Result.jsx')
var _ = require('lodash');


var ResultList = React.createClass({
    propTypes: {
        results: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    },    
    render: function(){
        var content = this.props.results.map(function(result){
          return (
            <Result key={result.id} data={result} />
          )
    });
    return (
      <ul className="result_list">{content}</ul>
    )

    }
});


var Results = React.createClass({
    mixins: [
            Reflux.connect(ResultStore, 'results')
    ],    
    getInitialState: function() {
        return {results: this.props.initialResults || []};
    },    
    render: function(){
        return <ResultList results={this.state.results}/>

    }
});



module.exports = Results;