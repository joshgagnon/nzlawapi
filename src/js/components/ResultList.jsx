"use strict";
var React = require('react');
var Reflux = require('reflux');
var ResultStore = require('../stores/ResultStore');
var Serialization = require('../stores/Serialization');
var Result = require('./Result.jsx');
var _ = require('lodash');
var $ = require('jquery');


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
        Reflux.listenTo(ResultStore, 'onResults'),
    ],    
    getInitialState: function() {
        return {results: this.props.initialResults || []};
    }, 
    onResults: function(data){
        var padding = 20;
        this.setState({results: data.results});
        if(data.current){
            var container = $(this.getDOMNode()),
                scrollTo = $('.'+data.current);
            container.animate({scrollTop:scrollTo.offset().top -container.offset().top + container.scrollTop()- padding} );
        }
    },
    render: function(){
        return <ResultList results={this.state.results}/>

    }
});



module.exports = Results;