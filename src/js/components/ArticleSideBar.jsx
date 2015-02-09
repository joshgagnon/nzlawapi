var React = require('react/addons')
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
var ArticleSummary = require('./ArticleSummary.jsx');


module.exports = React.createClass({
    getInitialState: function(){
        return {active: 0}
    },
    handleTab: function(active){
        this.setState({active: active})
    },
    render: function(){
        return <div className="sidebar-wrapper navbar-default visible-md-block visible-lg-block">
                <TabbedArea activeKey={this.state.active} onSelect={this.handleTab}>
                    <TabPane  eventKey={0} tab="Locations" >
                        <ArticleScrollSpy article={this.props.article} />
                     </TabPane>
                    <TabPane  eventKey={1} tab="Summary" >
                        <ArticleSummary article={this.props.article} />
                     </TabPane>
                    <TabPane  eventKey={2} tab="References" >
                        <ArticleScrollSpy article={this.props.article} />
                     </TabPane>
                    <TabPane  eventKey={3} tab="Older" >
                        <ArticleScrollSpy article={this.props.article} />
                     </TabPane>
                     </TabbedArea>
            </div>
     },
    });