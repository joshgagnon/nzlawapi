var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');
var SplitButton = require('./SplitButton.jsx');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var Col= require('react-bootstrap/lib/Col');
var PageStore = require('../stores/PageStore');
var ViewerStore = require('../stores/ViewerStore');
var SavedStates = require('../stores/SavedStates.js');
var BrowserStore = require('../stores/BrowserStore.js');
var PageStore = require('../stores/PageStore.js');
var PrintStore = require('../stores/PrintStore.js');
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
var TabView = require('./TabView.jsx');
var PrintView = require('./PrintView.jsx');
var UserControls = require('./UserControls.jsx');


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

var UndoMixin = {
    componentDidMount: function(){
        $(document).on('keypress', function(e){
            if(e.shiftKey){
                if(e.keyCode === 60){
                    Actions.goBack();
                }
                if(e.keyCode === 62){
                    Actions.goForward();
                }

            }
        });
    }
}

module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(PageStore, 'onState'),
        Reflux.listenTo(ViewerStore, 'onState'),
        Reflux.listenTo(DialogStore, 'onState'),
        Reflux.listenTo(BrowserStore, 'onState'),
        Reflux.listenTo(PrintStore, 'onState'),
        React.addons.LinkedStateMixin,
        ReactRouter.State,
        UndoMixin
    ],
    getInitialState: function(){
        return {
            pages: Immutable.List(),
            views: ViewerStore.getDefaultData(),
            browser: Immutable.Map(),
            print: Immutable.List(),
            save_dialog: false,
            load_dialog: false,
        };
    },
    componentDidMount: function(){
        if(this.getParams().query === 'query' && !_.isEmpty(this.getQuery())){
            Actions.newPage({query: this.getQuery(), title: this.getQuery.title}, 'tab-0');
            Actions.loadPrevious(['browser']);
        }
        else if(this.getParams().doc_type){
            Actions.newPage({query: {doc_type: this.getParams().doc_type,  id: this.getParams().id}}, 'tab-0');
            Actions.loadPrevious(['browser']);
        }
        else{
            Actions.loadPrevious();
        }
        this.__state = {};
        this.aggSetState = _.debounce(function(){
            this.setState(this.__state);
            this.__state = {};
        }.bind(this), 0)
    },
    onState: function(state){
        this.__state = _.extend(this.__state, state);
        this.aggSetState();
    },
    submit: function(e){
        e.preventDefault();
        this.fetch();
    },
    fetch: function(){
        if(!this.state.search_query){
            return;
        }
        var query;
        var title;
        var page_type = 'article';
        if(this.showLocation()){
            query = {
                doc_type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                location: this.state.location,
                id: this.state.query || this.state.document_id
            };
            title = this.state.search_query
        }
        else if(this.state.document_id){
            query = {
                doc_type: this.state.article_type,
                find: this.state.find,
                id: this.state.query || this.state.document_id
            };
            title = this.state.search_query
        }
        else{
            page_type = 'search';
            query = {
                doc_type: 'all',
                query: this.state.search_query
            };
            title = 'Search: '+ this.state.search_query
            if(this.state.location){
                title += ' '+this.state.location;
            }
        }
        Actions.newPage({query: query, title: title, page_type: page_type}, 'tab-0');
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
    handleEnter: function(e){
        if (e.key === 'Enter') {
            this.submit(e);
        }
    },
    reset: function(){
        this.setState({
            article_type: null,
            search_query: null,
            location: null
        });
        Actions.reset();
    },

    toggleAdvanced: function(){
        var active = this.getActive();
        if(active && active.get('page_type') === 'search'){
            Actions.toggleAdvanced('tab-0', active.get('id'));
        }
        else{
             Actions.newAdvancedPage(
                {title: 'Advanced Search',
                page_type: 'search'
            }, 'tab-0')
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
        var id = this.state.views.getIn(['tab-0' ,'active_page_id'])
        if(id){
            return this.state.pages.find(function(p){
                return p.get('id') === id;
            });
        }
    },
    showSidebar: function(page){
        if(page && page.get('content') && page.get('page_type') !== 'search'){
            return true;
        }
        return false;
    },
    renderBody: function(){
        var active = this.getActive();
        if(this.state.browser.get('print_mode') ){
            return <div className="split print">
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'}/>
                <PrintView print={this.state.print} view={this.state.views.get('print')} viewer_id={'print'} key={'print'}/>
                </div>
        }
        else if(this.state.browser.get('split_mode') ){
            return <div className="split">
                <TabView  browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'}/>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-1')} viewer_id={'tab-1'} key={'tab-1'}/>
                </div>
        }
        else if (this.showSidebar(active)){
            return <div className="sidebar-visible">
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'}/>
                <ArticleSideBar article={active} viewer_id={'tab-0'} />
                </div>
        }
        return  <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'}/>

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
                    { this.showLocation() ? <Input type="text" className="location" placeholder="Focus..." ref="location" value={this.state.location}
                        onChange={this.handleLocation} onKeyPress={this.handleEnter}
                        ref="location"  /> : null }
                    <SplitButton bsStyle={'primary'} title={'Search'} onClick={this.submit} >
                            <MenuItem eventKey={'search_all'}>Search All</MenuItem>
                            <MenuItem divider />
                            <MenuItem eventKey={'search_advanced'} onClick={this.toggleAdvanced}>Advanced Search</MenuItem>
                    </SplitButton>
                     </AutoComplete>
                </form>
    },
    render: function(){
       var resultsClass = 'results-container ';
        var parentClass ="act_browser ";
        if(this.state.browser.get('underlines') ){
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

                 <UserControls />
                </nav>
                </div>
            <div className="buttonbar-wrapper">
                <a onClick={this.toggleAdvanced}><Glyphicon glyph="search" title="Advanced Search"/></a>
                <a onClick={Actions.toggleUnderlines}><Glyphicon glyph="text-color" title="Underlines"/></a>
                <a onClick={Actions.toggleSplitMode}><Glyphicon glyph="object-align-top" title="Columns"/></a>
                <a onClick={Actions.togglePrintMode}><Glyphicon glyph="print" title="Print"/></a>
                <a onClick={this.toggleState.bind(this, 'load_dialog')}><Glyphicon glyph="floppy-open" title="Open"/></a>
                <a onClick={this.toggleState.bind(this, 'save_dialog')}><Glyphicon glyph="floppy-save" title="Save"/></a>
                <a onClick={this.reset}><Glyphicon glyph="trash" title="Reset"/></a>
                {/* <a><Glyphicon glyph="star" /></a> */}
            </div>
            { this.state.pages.count() ? this.renderBody() : null}
        </div>);
    }
});