"use strict";
window.API_VERSION = '0.1.1';

var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Browser = require('./components/Browser.jsx');
var PublishedView = require('./components/PublishedView.jsx');
var CasePreview = require('./components/CasePreview.jsx');

React.initializeTouchEvents(true);

// temporary, will set up proper logger later
if(!window.console || !window.console.log){
  window.console = {
    log:function(){}
  }
}

var App = React.createClass({
    render: function(){
        return (<ReactRouter.RouteHandler/>);
    }
});


var routes = (
  <ReactRouter.Route name="app" path="/" handler={App} >
    <ReactRouter.Route name="search" path="search"  handler={Browser}/>
    <ReactRouter.Route name="open_article" path="/open_article/:query" handler={Browser}/>
    <ReactRouter.Route name="open_article_subtype" path="/open_article/:doc_type/:id" handler={Browser}/>
    <ReactRouter.Route name="open_definition" path="/open_definition/:definition_ids/" handler={Browser}/>
    <ReactRouter.Route name="published" path="/published/:id" handler={PublishedView}/>
    <ReactRouter.Route name="edit_published" path="/edit_published/:edit_id" handler={Browser}/>
    <ReactRouter.Route name="case_preview" path="/case_preview" handler={CasePreview}/>
    <ReactRouter.DefaultRoute handler={Browser}/>
  </ReactRouter.Route>
);

ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
  React.render(<Handler/>, document.getElementById('app'));
});
