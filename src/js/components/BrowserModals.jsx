"use strict"
var React = require('react/addons');
var Button = require('react-bootstrap/lib/Button');
var Reflux = require('reflux');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');
var PublishStore = require('../stores/PublishStore.js');

var Button = require('react-bootstrap/lib/Button');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');
// TODO move all modals here


var PublishModal = React.createClass({


    close: function(){
        Actions.closePublishedUrl();
    },
    render: function() {
        var url = (window.location.origin + this.props.publish.get('url'));
        return (
            <div className="static-modal">
            <Modal {...this.props} title={'Document Published'} animation={true} onRequestHide={this.close}>
                <div className='modal-body'>
                <p>This print document is now publically available.  Just copy the link below:</p>
                <p><a href={url} target="_blank">{url}</a></p>
                </div>
                <div className='modal-footer'>
                    <Button onClick={this.close}>Close</Button>
                </div>
            </Modal>
            </div>
        );
    }
});



module.exports =  React.createClass({
    mixins:[
        Reflux.listenTo(PublishStore, 'onState'),
        ],
    getInitialState: function(){
         return {publish: PublishStore.getInitialState().publish}
    },
    onState: function(state){
        this.setState(state);
    },
    render: function(){
        return <div>
                { this.state.publish.get('show') ? <PublishModal  key="publish" publish={this.state.publish} /> : null }
            </div>
    }

});