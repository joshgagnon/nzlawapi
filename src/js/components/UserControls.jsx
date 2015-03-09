var React = require('react');

module.exports = React.createClass({
    render: function(){
        return <div className="user-controls">
            <a href="https://users.catalex.nz">Account</a>
            <a href="https://users.catalex.nz/auth/logout">Logout</a>
        </div>
    }
});