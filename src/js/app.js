"use strict";

var React = require('react');
var Actions = require('./actions/Actions');
var ReactRouter = require('react-router');
//var SearchForm = require('./components/SearchForm.jsx');
//var Results = require('./components/ResultList.jsx');
//var Validator = require('./components/Validator.jsx');
var Browser = require('./components/Browser.jsx');
//var Graph = require('./components/Graph.jsx');
var $ = require('jquery');
var _ = require('lodash');


function scrollTo($element){
	$element.scrollintoview();
}
/*
var Browser = React.createClass({
	render: function(){
		return (
			<div className="wrapper">
	    		<div className=" sidebar-offcanvas" id="sidebar">
	                <img src="/build/images/logo-colourx2.png" alt="CataLex" className="logo hidden-xs img-responsive center-block"/>
	                <ul className="nav">
	                    <li><a href="#" data-toggle="offcanvas" className="visible-xs text-center"><i className="glyphicon glyphicon-chevron-right"></i></a>
	                    </li>
	                </ul>
	                <ul className="nav visible-xs" id="xs-menu">
	                    <li><a href="#search" className="text-center"><i className="glyphicon glyphicon-search"></i></a>
	                    </li>
	                </ul>
	                <SearchForm collapsable={true} initialForm={initialForm}/>
	            </div>
	             	<Results initialResults={initialResults}/>
	        </div>
	       )
	}
})
*/
 /*<header>
  <ul>
    <li><ReactRouter.Link to="app">Browser</ReactRouter.Link></li>
    <li><ReactRouter.Link to="validator">Validator</ReactRouter.Link></li>
  </ul>
</header>*/
var App = React.createClass({
	render: function(){
		return (
		        <ReactRouter.RouteHandler/>
		      );
	}
});


// load results


    /*<ReactRouter.Route name="validator" handler={Validator}/>
    <ReactRouter.Route name="browser" handler={Validator}/>
    <ReactRouter.Route name="full_article" handler={Article} />
    <ReactRouter.Route name="graph" handler={Graph} />*/

var routes = (
  <ReactRouter.Route name="app" path="/" handler={App}>
  <ReactRouter.Route name="open_article" path="/open_article/:query" handler={Browser}/>
  <ReactRouter.Route name="open_article_subtype" path="/open_article/:doc_type/:id" handler={Browser}/>
    <ReactRouter.DefaultRoute handler={Browser}/>
  </ReactRouter.Route>
);


ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
  React.render(<Handler/>, document.body);
});

/*	$('[data-toggle=offcanvas]').click(function() {
	  	$(this).toggleClass('visible-xs text-center');
	    $(this).find('i').toggleClass('glyphicon-chevron-right glyphicon-chevron-left');
	    $('.row-offcanvas').toggleClass('active');
	    $('#lg-menu').toggleClass('hidden-xs').toggleClass('visible-xs');
	    $('#xs-menu').toggleClass('visible-xs').toggleClass('hidden-xs');
	    $('#btnShow').toggle();
	});
})();*/


//var initialState = JSON.parse(document.getElementById('initial-state').innerHTML)