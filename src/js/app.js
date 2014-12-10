"use strict";

var React = require('react');
var Actions = require('./actions/Actions');
var SearchForm = require('./components/SearchForm.jsx');
var $ = require('jquery');
var _ = require('lodash');


React.render(<SearchForm collapsable={true}/>,
	document.getElementById('form_wrap'));

Actions.typeChange({type: 'act'});



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

