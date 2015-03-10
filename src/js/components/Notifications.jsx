var _ = require('lodash');
var React = require('react/addons');
var Reflux = require('reflux');
var NotificationStore = require('../stores/NotificationStore.js');
var Immutable = require('immutable');
var Actions = require('../actions/Actions');
var FadeMixin = require('react-bootstrap/lib/FadeMixin');

var Notification = React.createClass({
    mixins:[
        FadeMixin
        ],
    render: function(){
        var classes = "notification alert fade";
        if(this.props.error){
           classes += ' alert-danger';
        }
        else{
            classes += ' alert-success'
        }
        return <div className={classes} onClick={Actions.closeNotification.bind(null, this.props.id)} >
                <img src="/build/images/law-browser-sml.png" /><span>{ this.props.message }</span>
            </div>
    }
});


module.exports = React.createClass({
    mixins:[
        Reflux.listenTo(NotificationStore, 'onState'),
    ],
    getInitialState: function(){
         return {notifications: Immutable.List()}
    },
    onState: function(state){
        this.setState(state);
    },
    render: function(){
        if(this.state.notifications.size){
            return <div className="notifications">
                {this.state.notifications.map(function(n){
                    return <Notification key={n.id} id={n.id} message={n.message} error={n.error}/>
                }, this).toJS()}
            </div>
        }
        else{
            return <span/>
        }

    }
});