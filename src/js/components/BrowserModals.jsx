"use strict"
var React = require('react/addons');
var Button = require('react-bootstrap/lib/Button');
var Reflux = require('reflux');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var Actions = require('../actions/Actions.js');
var _ = require('lodash');
var PublishStore = require('../stores/PublishStore.js');
var ErrorStore = require('../stores/ErrorStore.js');
var ErrorModal = require('./ErrorModal.jsx');
var SavedStates = require('../stores/SavedStates.js');
var SaveDialog = require('./SaveDialog.jsx');

var Button = require('react-bootstrap/lib/Button');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');

// TODO move all modals here

var DialogStore = Reflux.createStore({
    listenables: Actions,
    onOpenSaveDialog: function(){
        this.trigger({save_dialog: true});
    },
    onOpenLoadDialog: function(){
        this.trigger({load_dialog: true});
    },
    onCloseSaveDialog: function(){
        this.trigger({save_dialog: false});
    },
    onCloseLoadDialog: function(){
        this.trigger({load_dialog: false});
    },
});

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
        Reflux.listenTo(DialogStore, 'onState'),
        Reflux.listenTo(ErrorStore, 'onState')
        ],
    getInitialState: function(){
         return {
            publish: PublishStore.getInitialState().publish,
            save_dialog: false,
            load_dialog: false
         }
    },
    onState: function(state){
        this.setState(state);
    },
    render: function(){
        return <div>
                { this.state.publish.get('show') ? <PublishModal  key="publish" publish={this.state.publish} /> : null }
                { this.state.errorText ? <ErrorModal errorTitle={this.state.errorTitle} errorText={this.state.errorText} /> : null }
                { this.state.save_dialog ? <SaveDialog.Save /> : null }
                { this.state.load_dialog ? <SaveDialog.Load /> : null }
            </div>
    }

});