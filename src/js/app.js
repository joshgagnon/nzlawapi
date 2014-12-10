"use strict";

var React = require('react');
var Actions = require('./actions/Actions');
var SearchForm = require('./components/SearchForm.jsx');
var Results = require('./components/ResultList.jsx');
var $ = require('jquery');
var _ = require('lodash');

var initialResults = [{content: 'x', id: 1}]
var initialForm = {
	type: 'act',
	act: 'Companies Act 1993'
}


React.render(<SearchForm collapsable={true} initialForm={initialForm}/>,
	document.getElementById('query_form'));
React.render(<Results initialResults={initialResults}/>,
	document.getElementById('results_viewer'));

//Actions.typeChange({type: 'act'});


function scrollTo($element){
	$element.scrollintoview();
}



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