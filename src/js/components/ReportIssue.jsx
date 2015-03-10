var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var ModalTrigger = require('react-bootstrap/lib/ModalTrigger');
var Button = require('react-bootstrap/lib/Button');
var request = require('superagent-promise');


var ReportIssueModal = React.createClass({

    preventSubmit: function(e){
        e.preventDefault();
    },
    submit: function(){

    },
    render: function() {
        return  <Modal {...this.props} title="User Name" animation={true}>
                <div className="modal-body">
                    <form className="form" onSubmit={this.preventSubmit}>
                        <Input type="textarea" label="Details" value={this.props.details} onChange={this.props.details} />
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