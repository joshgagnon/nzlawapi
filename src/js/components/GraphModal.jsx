var React = require('react');
var Modal = require('react-bootstrap/Modal');
var Graph = require('./Graph.jsx');

module.exports =  React.createClass({
    render: function() {
        return (
            <Modal {...this.props} title="Act Reference Map" className={'graph-modal'} animation={false}>
                <div className="modal-body">
                    <Graph />
                </div>
            </Modal>
        );
    }
});
