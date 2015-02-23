var React = require('react/addons')
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
var ArticleSummary = require('./ArticleSummary.jsx');
var ArticleReferences = require('./ArticleReferences.jsx');


var strings = {
    'location': 'Location',
    'summary': 'Summary',
    'references': 'References',
    'versions': 'Versions',
};


module.exports = React.createClass({
    getInitialState: function(){
        return {active: 'references', options: ['location', 'summary', 'references', 'versions']};
    },
    setVisible: function(active){
        this.setState({active: active})
    },
    renderBody: function(){
        if(this.state.active === 'location'){
            return <ArticleScrollSpy article={this.props.article} />;
        }
        else if(this.state.active === 'summary'){
             return <ArticleSummary summary={this.props.article.content.attributes} />;
        }
        else if(this.state.active === 'references'){
             return <ArticleReferences article={this.props.article} />;
        }
        else{
             return <ArticleReferences article={this.props.article} />;
        }
    },
    render: function(){
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