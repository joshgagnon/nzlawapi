var React = require('react');
var ReportIssue = require('./ReportIssue.jsx');
Actions = {}


module.exports = React.createClass({
    render: function(){
        return <div className="user-controls">
            <ReportIssue />
            <a >Tour</a>
            <a href="https://users.catalex.nz">Account</a>
            <a href="/logout">Logout</a>
        </div>
    },
    render1: function(){

    	 return <div className="user-controls">
    	 	<div className="buttonbar-wrapper">
            <ul>


            <li onClick={Actions.openLoadDialog}><div className="button"><a><span className="fa fa-folder-open" title="Open Saved Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Open Saved Session</a></li>
                </ul>
            </li>

            <li onClick={Actions.openSaveDialog}><div className="button"><a><span className="fa fa-floppy-o" title="Save Saved Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Save Session</a></li>
                </ul>
            </li>

             <li onClick={Actions.reset}><div className="button"><a><span className="fa fa-close" title="Reset Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Reset Session</a></li>
                </ul>
            </li>

            </ul>
        </div>
        </div>
    }
});