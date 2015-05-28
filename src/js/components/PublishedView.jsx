"use strict";

var React = require('react/addons');
var Banner = require('./Banner.jsx');
var ReactRouter = require('react-router');


module.exports = React.createClass({
    mixins: [ReactRouter.State],
    render: function(){
        var id = this.context.router.getCurrentParams().id;
      return <Banner>
      <form className="published-form"><a href={"/edit_published/"+id } className="btn btn-primary">Edit This Document</a></form>
      </Banner>

    }
});
