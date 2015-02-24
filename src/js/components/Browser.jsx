var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');
var Col= require('react-bootstrap/lib/Col');
var PageStore = require('../stores/PageStore');
var ViewerStore = require('../stores/ViewerStore');
var SavedStates = require('../stores/SavedStates.js');
var BrowserStore = require('../stores/BrowserStore.js');
var Actions = require('../actions/Actions');
var SearchResults = require('./SearchResults.jsx');
var ArticleSideBar = require('./ArticleSideBar.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var JumpTo= require('./JumpTo.jsx');
var Immutable = require('immutable');

var SaveDialog = require('./SaveDialog.jsx');

var AdvancedSearch = require('./AdvancedSearch.jsx');


$.fn.focusNextInputField = function() {
    return this.each(function() {
        var fields = $(this).parents('form:eq(0),body').find('button,input,textarea,select');
        var index = fields.index( this );

        if ( index > -1 && ( index + 1 ) < fields.length ) {
            fields.eq( index + 1 ).focus();
        }
        return false;
    });
};

var DialogStore = Reflux.createStore({
    listenables: Actions,
    onCloseSaveDialog: function(){
        this.trigger({save_dialog: false});
    },
    onCloseLoadDialog: function(){
        this.trigger({load_dialog: false});
    },
});



var PageSet = React.createClass({
    handleTab: function(active){
        Actions.showPage(this.props.viewer_id, active);
    },
    closeTab: function(id){
        Actions.removePage(id);
    },
    shouldComponentUpdate: function(newProps, newState){
        return (this.props.view !== newProps.view) || (this.props.pages !== newProps.pages);
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
                        return (
                             <TabPane key={page.get('id')} eventKey={page.get('id')} tab={page.get('title')} >
                                { this.props.view.getIn(['settings', 'page.id', 'advanced_search']) ? <AdvancedSearch /> : null }
                                { this.renderPage(page) }
                            </TabPane>
                          )
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
             { this.props.view.getIn(['settings', this.props.pages.getIn([0, 'id', 'advanced_search'])]) ? <AdvancedSearch /> : null }
            {  this.renderPage(this.props.pages.get(0)) }
                </div></div>
        }
        else{
            <div className="results-empty"/>
        }
    }

})


module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(PageStore, 'onState', this.onState),
        Reflux.listenTo(ViewerStore, 'onState', this.onState),
        // MOVE TO CHILD, maybe
        Reflux.listenTo(DialogStore, 'onState', this.onState),
        Reflux.listenTo(BrowserStore, 'onState', this.onState),
        React.addons.LinkedStateMixin,
        ReactRouter.State
    ],
    getInitialState: function(){
        return {
            pages: Immutable.List(),
            views: ViewerStore.getDefaultData(),
            underlines: true, //false,
            save_dialog: false,
            load_dialog: false,
            split_mode: false
        };
    },
    componentDidMount: function(){
        if(this.getParams().query === 'query' && !_.isEmpty(this.getQuery())){
            Actions.newPage({query: this.getQuery(), title: this.getQuery.title}, 0);
        }
        else if(this.getParams().doc_type){
            Actions.newPage({query: {doc_type: this.getParams().doc_type,  id: this.getParams().id}}, 0);
        }
        else{
            Actions.loadPrevious();
        }
       /* window.addEventListener('onResize', function(){
            //TODO, debouce, measure width, hide,
        });*/
    },
    onState: function(state){
        this.setState(state);
    },
    submit: function(e){
        e.preventDefault();
        this.fetch();
    },
    fetch: function(){
        if(!this.state.search_query){
            return;
        }
        this.setState({
            loading: true
        });
        var query;
        var title;
        if(this.showLocation()){
            query = {
                doc_type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                location: this.state.location,
                id: this.state.document_id
            };
            title = this.state.search_query
        }
        else if(this.state.document_id){
            query = {
                doc_type: this.state.article_type,
                find: this.state.find,
                id: this.state.document_id
            };
            title = this.state.search_query
        }
        else{
            query = {
                doc_type: 'all',
                search: 'basic',
                query: this.state.search_query
            };
            title = 'Search: '+this.state.search_query
        }
        Actions.newPage({query: query, title: title}, 0);
    },
    handleArticleChange: function(value){
        var self = this;
        // ID means they clicked or hit enter, so focus on next
        this.setState({search_query: value.search_query, document_id: value.id,
            article_type: value.type, find: value.find, query: value.query}, function(){
            if(self.showLocation()){
                // hack!
                setTimeout(function(){
                    self.refs.location.getInputDOMNode().focus();
                }, 0);
            }
        });
    },
    handleLocation: function(e){
        e.stopPropagation();
        this.setState({location: e.target.value});
    },
    reset: function(){
        this.setState({
            article_type: null,
            search_query: null,
            location: null
        });
        Actions.setState({});
    },

    toggleAdvanced: function(){
        var active = this.getActive();
        if(this.active && this.active.query.search){
            Actions.toggleAdvanced(0, this.state.views[0].active_page_id);
        }
        else{
             Actions.newAdvancedPage({title: 'Advanced Search', query: {search: true}}, 0)
        }
    },
    toggleState: function(state){
        var s = {};
        s[state] = !this.state[state]
        this.setState(s);
    },
    showLocation: function(){
        return !!this.state.document_id && this.state.find === 'full';
    },
    getActive: function(){
        var id = this.state.views.getIn([0 ,'active_page_id'])
        if(id){
            return this.state.pages.find(function(p){
                return p.get('id') === id;
            });
        }
    },
    showSidebar: function(page){
        if(page && page.get('content') && !page.getIn(['query','search'])){
            return true;
        }
        return false;
    },
    renderBody: function(){
        var active = this.getActive();
        if(this.state.split_mode){
            return <div className="split">
                <PageSet pages={this.state.pages} view={this.state.views.get(0)} viewer_id={0} key={0}/>
                <PageSet pages={this.state.pages} view={this.state.views.get(1)} viewer_id={1} key={1}/>
                </div>
        }
        else if (this.showSidebar(active)){
            return <div className="sidebar-visible">
                <PageSet pages={this.state.pages} view={this.state.views.get(0)} viewer_id={0} key={0}/>
                <ArticleSideBar article={active} viewer_id={0} />
                </div>
        }
        return  <PageSet pages={this.state.pages} view={this.state.views.get(0)} viewer_id={0}/>

    },
    renderForm: function(){
        var formClasses = '';//"navbar-form navbar-left ";
        if(this.showLocation()){
            formClasses += 'showing-location';
        }
        return   <form className={formClasses}>
                 <AutoComplete endpoint="/article_auto_complete" onUpdate={this.handleArticleChange} className='main-search'  autoCapitalize="off" autoCorrect="off"
                    search_value={{search_query: this.state.search_query, id: this.state.document_id, type: this.state.article_type }}
                    ref="autocomplete" >
                    { this.showLocation() ? <Input type="text" className="location" placeholder="Focus..." ref="location" value={this.state.location} onChange={this.handleLocation}
                        ref="location"  /> : null }

                    <div className="input-group-btn">
                        <button type="input" className="btn-primary btn" onClick={this.submit} >Search</button>
                         <button  type="button" className="btn-primary btn dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                          <span className="caret"></span>
                          <span className="sr-only">Toggle Dropdown</span>
                        </button>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="#">Search All</a></li>
                            <li><a href="#">Search Acts</a></li>
                            <li><a href="#">Search Regulations</a></li>
                            <li><a href="#">Search Cases</a></li>
                            <li className="divider"></li>
                            <li><a href="#" onClick={this.toggleAdvanced}>Advanced Search</a></li>
                          </ul>
                     </div>
                     </AutoComplete>
                </form>
    },
    render: function(){
       var resultsClass = 'results-container ';
        var parentClass ="act_browser ";
        if(this.state.underlines){
            parentClass += 'underlines';
        }
        return (<div className className={parentClass}>
                <div className="container-fluid">
                { this.state.save_dialog ? <SaveDialog.Save /> : null }
                { this.state.load_dialog ? <SaveDialog.Load /> : null }
                 <nav className="navbar navbar-default navbar-fixed-top">
                  <img className="chev-left hidden-xs" src="/build/images/left-chevron.png"/><img className="chev-right hidden-sm" src="/build/images/right-chevron.png"/>
                    <div className="brand-wrap">
                         <img src="/build/images/law-browser.png" alt="CataLex" className="logo img-responsive center-block hidden-xs"/>
                         <img src="/build/images/law-browser-sml.png" alt="CataLex" className="logo-sml img-responsive center-block visible-xs-block"/>

                    </div>
                    { this.renderForm() }

                </nav>
                </div>
            <div className="buttonbar-wrapper">
                <a><Glyphicon glyph="search" onClick={this.toggleAdvanced} title="Advanced Search"/></a>
                <a><Glyphicon glyph="text-color" onClick={Actions.toggleUnderlines} title="Underlines"/></a>
                <a><Glyphicon glyph="object-align-top" onClick={Actions.toggleSplitMode} title="Columns"/></a>
                <a><Glyphicon glyph="floppy-open" onClick={this.toggleState.bind(this, 'load_dialog')} title="Open"/></a>
                <a><Glyphicon glyph="floppy-save" onClick={this.toggleState.bind(this, 'save_dialog')} title="Save"/></a>
                <a><Glyphicon glyph="print" onClick={Actions.togglePrintMode} title="Print"/></a>
                <a><Glyphicon glyph="star" /></a>
                <a><Glyphicon glyph="trash"  onClick={this.reset} title="Reset"/></a>
            </div>
            { this.state.pages.count() ? this.renderBody() : null}
        </div>);
    }
});