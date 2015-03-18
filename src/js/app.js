"use strict";
window.API_VERSION = '0.1.1';

var React = require('react/addons');
var Reflux = require('reflux');
var Actions = require('./actions/Actions');
var ReactRouter = require('react-router');
var Browser = require('./components/Browser.jsx');
//var Graph = require('./components/Graph.jsx');
var $ = require('jquery');
var _ = require('lodash');
Reflux.setPromise(require('bluebird'));

React.initializeTouchEvents(true)
var App = React.createClass({
  render: function(){
    return (
            <ReactRouter.RouteHandler/>
          );
  }
});

var routes = (
  <ReactRouter.Route name="app" path="/" handler={App} >
  <ReactRouter.Route name="open_article" path="/open_article/:query" handler={Browser}/>
  <ReactRouter.Route name="open_article_subtype" path="/open_article/:doc_type/:id" handler={Browser}/>
    <ReactRouter.DefaultRoute handler={Browser}/>
  </ReactRouter.Route>
);

ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
  React.render(<Handler/>, document.body);
});
