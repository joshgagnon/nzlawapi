var React = require('react/addons');


module.exports = React.createClass({
    render: function(){
        return <span className="form-control-feedback form-control-clear" aria-hidden="true" onMouseDown={this.props.clear}>
                <i className="fa fa-times"></i>
            </span>
    }
});
