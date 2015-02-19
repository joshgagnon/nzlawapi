var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var Col= require('react-bootstrap/Col');
var PageStore = require('../stores/PageStore');
var ViewerStore = require('../stores/ViewerStore');
var Serialization = require('../stores/Serialization.js');
var Actions = require('../actions/Actions');
var Glyphicon= require('react-bootstrap/Glyphicon');
var SearchResults = require('./SearchResults.jsx');
var ArticleSideBar = require('./ArticleSideBar.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var JumpTo= require('./JumpTo.jsx');


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
})


var PageSet = React.createClass({
    handleTab: function(active){
        Actions.showPage(this.props.viewer_id, active);
    },
    closeTab: function(id){
        var result = _.find(this.props.pages, function(d){ return d.id === id});
        Actions.removePage(result);
    },
    shouldComponentUpdate: function(newProps, newState){
        return (this.props.view !== newProps.view) || (this.props.pages !== newProps.pages);
    },
    renderPage: function(page){
        if(page.content){
            return page.query.search ?
                    <SearchResults key={page.id} result={page} viewer_id={this.props.viewer_id} view={this.props.view}/> :
                    <Article key={page.id} page={page} viewer_id={this.props.viewer_id} view_settings={this.props.view.settings[page.id] || {}}/>
        }
        else{
            return <div className="search-results csspinner traditional"/>;
        }
    },
    renderTabs: function(){
        var self = this;
        return (<div className="results-container">
                <TabbedArea activeKey={this.props.view.active_page_id} onSelect={this.handleTab} onClose={this.closeTab} viewer_id={this.props.viewer_id} >
                { this.props.pages.map(function(page){
                        return (
                             <TabPane key={page.id} eventKey={page.id} tab={page.title} >
                                { (this.props.view.settings[page.id] || {}).advanced_search ? <AdvancedSearch /> : null }
                                { this.renderPage(page) }
                            </TabPane>
                          )
                      }, this)
            }
            </TabbedArea></div>)
    },
    render: function(){
        console.log('render', this.props.viewer_id)
        if(this.props.pages.length >= 2){
            return this.renderTabs();
        }

        else if(this.props.pages.length === 1){
            return <div className="results-container"><div className="results-scroll">
             { (this.props.view.settings[this.props.pages[0].id] || {}).advanced_search ? <AdvancedSearch /> : null }
            {  this.renderPage(this.props.pages[0]) }
                </div></div>
        }
        else{
            <div className="results-empty"/>
        }
    }

})


module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(PageStore, 'onPages'),
        Reflux.listenTo(ViewerStore, 'onViewer'),
        Reflux.listenTo(DialogStore, 'onDialog'),
        React.addons.LinkedStateMixin,
        ReactRouter.State
    ],
    getInitialState: function(){
        return {
            advanced_search: false,
            pages: [],
            views: ViewerStore.getDefaultData(),
            underlines: false,
            save_dialog: false,
            load_dialog: false
        };
    },
    componentDidMount: function(){
        if(this.getParams().query === 'query' && !_.isEmpty(this.getQuery())){
            Actions.newPage({query: this.getQuery(), title: this.getQuery.title}, 0);
        }
        else if(this.getParams().type){
            Actions.newPage({query: {type: this.getParams().type,  query: this.getParams().id, find: 'id'}}, 0);
        }
        window.addEventListener('onResize', function(){
            //TODO, debouce, measure width, hide,
        });
    },
    onPages: function(data){
        this.setState({pages: data.pages});
    },
    onDialog: function(state){
        this.setState(state);
    },
    onViewer: function(state){
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
                type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                query: this.state.location,
                id: this.state.document_id
            };
            title = this.state.search_query
        }
        else if(this.state.document_id){
            query = {
                type: this.state.article_type,
                find: this.state.find,
                query: this.state.query,
                id: this.state.document_id
            };
            title = this.state.search_query
        }
        else{
            query = {
                type: 'all',
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
        Actions.clearPages();
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
        if(this.state.views[0].active_page_id){
            return _.find(this.state.pages, {id: this.state.views[0].active_page_id});
        }
    },
    showSidebar: function(page){
        if(page && !page.query.search && page.content){
            return true;
        }
        return false;
    },
    renderBody: function(){
        var active = this.getActive();
        if(this.state.split_mode){
            return <div className="split">
                <PageSet pages={this.state.pages} view={this.state.views[0]} viewer_id={0} key={0}/>
                <PageSet pages={this.state.pages} view={this.state.views[1]} viewer_id={1} key={1}/>
                </div>
        }
        else if (this.showSidebar(active)){
            return <div className="sidebar-visible">
                <PageSet pages={this.state.pages} view={this.state.views[0]} viewer_id={0} key={0}/>
                <ArticleSideBar article={active}/>
                </div>
        }
        return  <PageSet pages={this.state.pages} view={this.state.views[0]} viewer_id={0}/>

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
        //var show_side_bar =  active_result && active_result.content && !active_result.query.search && !this.state.split_mode;
        var resultsClass = 'results-container ';

        var parentClass ="act_browser ";
    /*   if(show_side_bar){
            parentClass += 'sidebar-visible ';
        }*/
        if(this.state.underlines){
            parentClass += 'underlines ';
        }
         if(this.state.split_mode){
            //resultsClass += 'split ';
        }
        return (<div className className={parentClass}>
                <div className="container-fluid">
                { this.state.save_dialog ? <SaveDialog.Save /> : null }
                { this.state.load_dialog ? <SaveDialog.Load /> : null }
                 <nav className="navbar navbar-default navbar-fixed-top">
                  <img className="chev-left hidden-xs" src="/build/images/left-chevron.png"/><img className="chev-right hidden-sm" src="/build/images/right-chevron.png"/>
                    <div className="brand-wrap">
                      {/*<a className="navbar-brand hidden-xs" href="#">
                           <img src="/build/images/logo-colourx2.png" alt="CataLex" className="logo img-responsive center-block"/>
                        </a>*/}
                         <img src="/build/images/law-browser.png" alt="CataLex" className="logo img-responsive center-block hidden-xs"/>
                         <img src="/build/images/law-browser-sml.png" alt="CataLex" className="logo-sml img-responsive center-block visible-xs-block"/>

                    </div>
                    { this.renderForm() }

                </nav>
                </div>
            <div className="buttonbar-wrapper">
                <a><Glyphicon glyph="search" onClick={this.toggleAdvanced} title="Advanced Search"/></a>
                <a><Glyphicon glyph="text-color" onClick={this.toggleState.bind(this, 'underlines')} title="Underlines"/></a>
                <a><Glyphicon glyph="object-align-top" onClick={this.toggleState.bind(this, 'split_mode')} title="Columns"/></a>
                <a><Glyphicon glyph="floppy-open" onClick={this.toggleState.bind(this, 'load_dialog')} title="Open"/></a>
                <a><Glyphicon glyph="floppy-save" onClick={this.toggleState.bind(this, 'save_dialog')} title="Save"/></a>
                <a><Glyphicon glyph="print" title="Print"/></a>
                <a><Glyphicon glyph="star" /></a>
                {/*<ModalTrigger modal={<GraphModal />}>
                    <a><Glyphicon glyph="globe" /></a>
                </ModalTrigger>*/}
                <a onClick={this.reset}><Glyphicon glyph="trash" title="Reset"/></a>
            </div>
            { this.state.pages.length ? this.renderBody() : null}

            { /*show_side_bar ? <ArticleSideBar article={active_result}/> : '' */}
        </div>);
    }
});