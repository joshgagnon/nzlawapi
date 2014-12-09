
var browser = require('./browser.js');
var Page = require('./components/page.jsx');
var Input = require('./components/input.jsx');
var Select = require('./components/select.jsx');
var Form = require('./components/form.jsx');
//var React = require('react');




var typeValues = [
	{val: 'act', label: 'Act'},
	{val: 'case', label: 'Court Case'}
	]

React.render(
<Form classes={['hidden-xs', 'legislation_finder']} >
  <Select name="type" label="Type" options={typeValues} />
  <Input name="query" type="text" label="Query" />
  
  <button id="submit" className="btn btn-primary submit">Search</button>
</Form>,
document.getElementById('form_wrap'));

