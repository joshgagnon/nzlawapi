var React = require('react/addons')
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
var ArticleSummary = require('./ArticleSummary.jsx');
var ArticleReferences = require('./ArticleReferences.jsx');
var ArticleVersions = require('./ArticleVersions.jsx');


var strings = {
    'location': 'Location',
    'summary': 'Summary',
    'references': 'References',
    'versions': 'Versions',
};


module.exports = React.createClass({
    getInitialState: function(){
        return {active: 'location', options: ['location',  'references', 'versions']};
    },
    setVisible: function(active){
        this.setState({active: active})
    },
    renderBody: function(childname){
        if(childname=== 'location'){
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
          return <div className="sidebar-wrapper visible-md-block visible-lg-block">
              <TabbedArea activeKey={this.state.active} tabsOnly={true}
                  onSelect={this.setVisible}>
                      {this.state.options.map(function(k){
                        return <TabPane key={k} eventKey={k} tab={strings[k]}>
                                { this.renderBody(k) }
                            </TabPane>
                      }.bind(this))}
              </TabbedArea>
            </div>
    },
    renderold: function(){
        return <div className="sidebar-wrapper visible-md-block visible-lg-block">

                <div className="btn-group">
                  <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                    {strings[this.state.active]} <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu" role="menu">
                    {this.state.options.map(function(k){
                        return <li onClick={this.setVisible.bind(this, k)} key={k}><a href="#" >{strings[k]}</a></li>
                    }.bind(this))}
                  </ul>
                </div>
                  {this.renderBody()}

            </div>
     },
    });