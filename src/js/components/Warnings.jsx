var React = require('react/addons');

var NotLatestVersion = React.createClass({
    render: function(){
        return <div className="alert alert-danger" role="alert"><strong>Warning</strong> This is not the latest reprint.</div>
    }
});

var ArticleError = React.createClass({
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