var React = require('react/addons')
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
var ArticleSummary = require('./ArticleSummary.jsx');
var ArticleReferences = require('./ArticleReferences.jsx');
var ArticleVersions = require('./ArticleVersions.jsx');


var strings = {
    'location': 'Location',
    'summary': 'Info',
    'references': 'References',
    'versions': 'Versions',
};

module.exports = React.createClass({
    getInitialState: function(){
        return {active: 'location', options: ['location',  'references', 'versions', 'summary']};
    },
    setVisible: function(active){
        this.setState({active: active})
    },
    renderBody: function(childname){

        if(childname === 'location'){
            return <ArticleScrollSpy article={this.props.article} viewer_id={this.props.viewer_id}
              position={this.props.view.getIn(['positions', this.props.article.get('id')])}/>;
        }
        else if(childname === 'summary'){
             return <ArticleSummary summary={this.props.article.getIn(['content','attributes']) } viewer_id={this.props.viewer_id}/>;
        }
        else if(childname=== 'references'){
             return <ArticleReferences article={this.props.article} viewer_id={this.props.viewer_id}/>;
        }
        else{
             return <ArticleVersions article={this.props.article} viewer_id={this.props.viewer_id}/>;
        }
    },
    render: function(){
          return  <TabbedArea activeKey={this.state.active} tabsOnly={true}
                  onSelect={this.setVisible}>
                      {this.state.options.map(function(k){
                        return <TabPane key={k} eventKey={k} tab={strings[k]}>
                                 { this.props.article.get('content') ? this.renderBody(k) : null }
                            </TabPane>
                      }.bind(this))}
              </TabbedArea>
    }
});