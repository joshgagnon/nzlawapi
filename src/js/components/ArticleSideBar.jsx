var React = require('react/addons')
var ArticleInfoTabs = require('./ArticleInfoTabs.jsx');

module.exports = React.createClass({
    render: function(){
          return <div className="sidebar-wrapper visible-md-block visible-lg-block">
                <ArticleInfoTabs {...this.props} />
            </div>
    }
});