var React = require('react');
var ReportIssue = require('./ReportIssue.jsx');

module.exports = React.createClass({
    render: function(){
        return <div className="user-controls">
            <ReportIssue />
            <a href="https://users.catalex.nz">Account</a>
            <a href="/logout">Logout</a>
        </div>
    }
});