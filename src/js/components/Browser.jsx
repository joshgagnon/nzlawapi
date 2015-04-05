var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
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
var Notifications = require('./Notifications.jsx');
var ContextMenu = require('./ContextMenu.jsx');
var ButtonBar = require('./ButtonBar.jsx');
var MQ = require('./Responsive.jsx');
var constants = require('../constants');


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
    onOpenSaveDialog: function(){
        this.trigger({save_dialog: true});
    },
    onOpenLoadDialog: function(){
        this.trigger({load_dialog: true});
    },
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
var Modal = require('react-bootstrap/lib/Modal');
var ArticleInfoTabs= require('./ArticleInfoTabs.jsx');

var PageDialog = React.createClass({
    render: function(){
        return <Modal onRequestHide={Actions.closePageDialog} title={this.props.page.get('title')}>
                <div className="modal-body">
                    <ArticleInfoTabs article={this.props.page} view={this.props.view} viewer_id={this.props.viewer_id} />
                </div>
        </Modal>
    }
});



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
    contextTypes: {
        //router: React.PropTypes.func.isRequired
      },
    getInitialState: function(){
        return {
            pages: Immutable.List(),
            views: ViewerStore.getDefaultData(),
            browser: BrowserStore.getInitialState().browser,
            print: Immutable.List(),
            save_dialog: false,
            load_dialog: false,
        };
    },
    componentDidMount: function(){
        if(this.context.router.getCurrentParams().query === 'query' && !_.isEmpty(this.context.router.getCurrentQuery())){

            Actions.newPage({query: this.context.router.getCurrentQuery(), title: this.context.router.getCurrentQuery().title}, 'tab-0');
            Actions.loadPrevious(['browser']);
        }
        else if(this.context.router.getCurrentParams().doc_type){
            Actions.newPage({page_type: this.context.router.getCurrentParams().doc_type,
                query: {doc_type: this.context.router.getCurrentParams().doc_type,
                id: this.context.router.getCurrentParams().id}}, 'tab-0');
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
        var page_type = constants.PAGE_TYPES.INSTRUMENT;
        if(this.showLocation()){
            query = {
                doc_type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                location: this.state.location,
                document_id: this.state.query || this.state.document_id
            };
            title = this.state.search_query
        }
        else if(this.state.document_id){
            query = {
                doc_type: this.state.article_type,
                find: this.state.find,
                document_id: this.state.query || this.state.document_id
            };
            title = this.state.search_query
        }
        else{
            page_type = constants.PAGE_TYPES.SEARCH;
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
    // deprecated
    reset: function(){
        this.setState({
            article_type: null,
            search_query: null,
            location: null
        });
        Actions.reset();
    },
    toggleState: function(state){
        var s = {};
        s[state] = !this.state[state]
        this.setState(s);
    },
    showLocation: function(){
        return !!this.state.document_id && (this.state.find === 'full' || this.state.find === "govt_location");
    },
    getActive: function(){
        var id = this.state.views.getIn(['tab-0' ,'active_page_id'])
        if(id){
            return this.state.pages.find(function(p){
                return p.get('id') === id;
            });
        }
    },
    canHaveSidebar: function(page){
        return page &&
            (page.get('page_type') ===  constants.PAGE_TYPES.INSTRUMENT
            //|| page.get('page_type') ===  constants.PAGE_TYPES.CASE
            )
    },
    showSidebar: function(page){
        return this.state.browser.get('show_sidebar') && this.canHaveSidebar(page);
    },
    toggleAdvanced: function(){
        var active = this.getActive();
        if(active && active.get('page_type') === constants.PAGE_TYPES.SEARCH){
            if(active.get('content')){
                Actions.toggleAdvanced('tab-0', active.get('id'));
            }
            else{
                Actions.removePage(active.get('id'));
            }
        }
        else{
             Actions.newPage(
                {title: 'Advanced Search',
                page_type: constants.PAGE_TYPES.SEARCH
            }, 'tab-0', {advanced_search: true})
        }
    },
    sidebar: function(active){
        if(active.get('page_type') === constants.PAGE_TYPES.INSTRUMENT){
            return <ArticleSideBar ref="sidebar" article={active} viewer_id={'tab-0'} view={this.state.views.get('tab-0')} />
        }
    },
    renderBody: function(){
        var active = this.getActive();
        if(this.state.browser.get('print_mode') ){
            return <div className="split print">
                <TabView key="tabview" browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'} showCloseView={true}/>
                <PrintView print={this.state.print} view={this.state.views.get('print')} viewer_id={'print'} key={'print'} showCloseView={true}/>
                </div>
        }
        else if(this.state.browser.get('split_mode')){
            return <div className="split">
                <TabView key="tabview" browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'} showCloseView={true}/>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-1')} viewer_id={'tab-1'} key={'tab-1'} showCloseView={true}/>
                </div>
        }
        else if (this.showSidebar(active)){
            return <div className="sidebar-visible">
                <TabView key="tabview" browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'}/>
                { this.sidebar(active)}
                </div>
        }
        return <TabView key="tabview" browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'}/>
    },
    renderForm: function(){
        var formClasses = '';
        if(this.showLocation()){
            formClasses += 'showing-location';
        }
        return   <form className={formClasses}>
                 <AutoComplete endpoint="/article_auto_complete" onUpdate={this.handleArticleChange} onKeyPress={this.handleEnter} className='main-search'  autoCapitalize="off" autoCorrect="off"
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
        var active = this.getActive();
        var parentClass ="act_browser ";

        if(this.state.browser.get('underlines') ){
            parentClass += ' underlines';
        }
        if(this.state.browser.get('notes') ){
            parentClass += ' notes';
        }
        return (<div className className={parentClass}>
                <div className="container-fluid">
                { this.state.save_dialog ? <SaveDialog.Save /> : null }
                { this.state.load_dialog ? <SaveDialog.Load /> : null }
                { this.state.browser.get('page_dialog') ? <PageDialog page={active} viewer_id={'tab-0'} view={this.state.views.get('tab-0')} /> : null }
                 <nav className="navbar navbar-default navbar-fixed-top">
                  <img className="chev-left hidden-xs" src="/build/images/left-chevron.png"/><img className="chev-right hidden-sm" src="/build/images/right-chevron.png"/>
                    <div className="brand-wrap">
                         <img src="/build/images/law-browser.png" alt="CataLex" className="logo img-responsive center-block hidden-xs"/>
                         <MQ maxWidth={768}>
                            <div className="logo-sml-button visible-xs-block">
                                <img src="/build/images/law-browser-sml.png" alt="CataLex" className="logo-sml img-responsive center-block "/>
                                <ButtonBar page={active} page_dialog={this.canHaveSidebar(active)} user_controls={true} viewer_id='tab-0'/>
                            </div>
                        </MQ>
                    </div>
                    { this.renderForm() }

                 <UserControls />
                </nav>
                </div>
            <MQ minWidth={768}>
                <ButtonBar page={active} sidebar={this.canHaveSidebar(active)} viewer_id='tab-0'/>
            </MQ>
            { this.state.pages.count() ? this.renderBody() : null}
            <Notifications />
            <ContextMenu />
        </div>);
    }
});