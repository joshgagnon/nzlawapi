var React = require('react/addons');


module.exports = React.createClass({
    handleDown: function(e){
        e.preventDefault();
        this.props.clear();
    },
    render: function(){
        return <span className="form-control-feedback form-control-clear" aria-hidden="true" onMouseDown={this.handleDown} >
                <i className="fa fa-times"></i>
            </span>
    }
});
