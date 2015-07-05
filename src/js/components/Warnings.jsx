var React = require('react/addons');

var NotLatestVersion = React.createClass({
    message: function(){
        return <span>{ this.props.msg }</span>
    },
    render: function(){
        return <div className="alert alert-danger" role="alert">
            <strong>Warning</strong> This is not the latest reprint. { this.props && this.props.msg ? this.message() : null }
        </div>
    }
});

var ArticleError = React.createClass({
    propTypes: {
        error: React.PropTypes.string
    },
    render: function(){
        return <div className="alert alert-danger" role="alert"><strong>Error</strong> {this.props.error}</div>
    }
});


module.exports ={
	NotLatestVersion: NotLatestVersion,
	ArticleError: ArticleError,
    CaseError: ArticleError,
    DefinitionError: ArticleError,
	SectionReferenceError: ArticleError,
	UnknownError: ArticleError
};