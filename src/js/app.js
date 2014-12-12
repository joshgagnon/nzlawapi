"use strict";

var React = require('react');
var Actions = require('./actions/Actions');
var SearchForm = require('./components/SearchForm.jsx');
var Results = require('./components/ResultList.jsx');
var $ = require('jquery');
var _ = require('lodash');

var initialResults = [];
var initialForm = {
	type: 'act',
	act_name: 'Companies Act 1993',
	act_find: 'section',
	query: 4
}


function scrollTo($element){
	$element.scrollintoview();
}
var App = React.createClass({
	render: function(){
		return (
			<div className="wrapper">
			    <div className="box">
			        <div className="row row-offcanvas row-offcanvas-left">
			            <div className="column col-sm-2 col-xs-1 sidebar-offcanvas" id="sidebar">
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
			            <div className="col-sm-10 col-xs-11 main">
							<nav className="navbar navbar-default navbar-static-top" role="navigation">
							  <div className="container">				  
							  </div>
							</nav>
			             <Results initialResults={initialResults}/>
			            </div>
			        </div>
			    </div>
			  </div>);
	}
});

React.render(<App/>, document.body);

(function sidebar(){
	$('[data-toggle=offcanvas]').click(function() {
	  	$(this).toggleClass('visible-xs text-center');
	    $(this).find('i').toggleClass('glyphicon-chevron-right glyphicon-chevron-left');
	    $('.row-offcanvas').toggleClass('active');
	    $('#lg-menu').toggleClass('hidden-xs').toggleClass('visible-xs');
	    $('#xs-menu').toggleClass('visible-xs').toggleClass('hidden-xs');
	    $('#btnShow').toggle();
	});
})();


//var initialState = JSON.parse(document.getElementById('initial-state').innerHTML)