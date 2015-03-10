var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var ModalTrigger = require('react-bootstrap/lib/ModalTrigger');
var Button = require('react-bootstrap/lib/Button');
var request = require('superagent-promise');
var SavedStates = require('../stores/SavedStates')

var ReportIssueModal = React.createClass({
    mixins:[
        React.addons.LinkedStateMixin,
    ],
    getInitialState: function(){
        return {details: ''}
    },
    preventSubmit: function(e){
        e.preventDefault();
    },
    submit: function(){
        request
            .post('/submit_issue', {
                state: SavedStates.prepState(),
                details: this.state.details
            })
            .end()
            .then(function(){
                this.props.onRequestHide();
            }.bind(this));
    },
    render: function() {
        return  <Modal {...this.props} title="User Name" animation={true}>
                <div className="modal-body">
                    <form className="form" onSubmit={this.preventSubmit}>
                        <Input type="textarea" label="Details" valueLink={this.linkState('details')}/>
                    </form>
                </div>
                <div className="modal-footer">
                <Button bsStyle="primary" onClick={this.submit}>Submit</Button>
                <Button onClick={this.props.onRequestHide}>Cancel</Button>
                </div>
            </Modal>
    }
})

module.exports = React.createClass({
    mixins: [
        React.addons.LinkedStateMixin
    ],
  render: function(){
    return <ModalTrigger ref="modal" modal={ <ReportIssueModal />}>
            <a href="#">Report Issue</a>
        </ModalTrigger>
    }
});