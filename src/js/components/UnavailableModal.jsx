var React = require('react/addons');
var Actions = require('../actions/Actions');
var Modal = require('react-bootstrap/lib/Modal');
var Button = require('react-bootstrap/lib/Button');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');

module.exports = React.createClass({
    mixins: [
        OverlayMixin
    ],
    clearError: function() {
        Actions.setUnavailable(false);
    },
    render: function() {
        return null;
    },
    renderOverlay: function() {
        return (
            <Modal {...this.props} title="Temporarily Unavailable" animation={true} onRequestHide={this.clearError}>
                <div className='modal-body'>
                    <p>CataLex Law Browser is currently unavailable due to maintainence. Please try again shortly.</p>
                </div>
                <div className='modal-footer'>
                    <Button onClick={this.clearError}>Close</Button>
                </div>
            </Modal>
        );
    }
});
