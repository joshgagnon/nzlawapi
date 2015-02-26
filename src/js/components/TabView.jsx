var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');
var SearchResults = require('./SearchResults.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var AdvancedSearch = require('./AdvancedSearch.jsx');


module.exports = React.createClass({
    handleTab: function(active){
        Actions.showPage(this.props.viewer_id, active);
    },
    closeTab: function(id){
        Actions.removePage(id);
    },
    shouldComponentUpdate: function(newProps, newState){
        return newProps.view.get('active_page_id') && (this.props.view !== newProps.view) || (this.props.pages !== newProps.pages);
    },
    renderPage: function(page){
        return page.getIn(['query', 'search']) ?
                    <SearchResults key={page.get('id')} page={page} viewer_id={this.props.viewer_id} view={this.props.view}/> :
                    <Article key={page.get('id')} page={page} view={this.props.view} viewer_id={this.props.viewer_id} />
    },
    renderTabs: function(){
        var self = this;
        return (<div className="results-container">
                <TabbedArea activeKey={this.props.view.get('active_page_id')}
                onSelect={this.handleTab}
                onClose={this.closeTab} viewer_id={this.props.viewer_id} >

                { this.props.pages.map(function(page){
                        return !page.get('print_only') ?
                             <TabPane key={page.get('id')} eventKey={page.get('id')} tab={page.get('title')} >
                                { this.props.view.getIn(['settings', page.get('id'), 'advanced_search']) ? <AdvancedSearch /> : null }
                                { this.renderPage(page) }
                            </TabPane> : null
                      }, this).toJS() //can remove in react 0.13
            }
            </TabbedArea></div>)
    },
    render: function(){
        //console.log('render', this.props.viewer_id)
        if(this.props.pages.count() >= 2){
            return this.renderTabs();
        }

        else if(this.props.pages.count() === 1){
            return <div className="results-container"><div className="results-scroll">
             { this.props.view.getIn(['settings', this.props.pages.get(0).get('id'), 'advanced_search']) ? <AdvancedSearch /> : null }
            {  this.renderPage(this.props.pages.get(0)) }
                </div></div>
        }
        else{
            <div className="results-empty"/>
        }
    }

});