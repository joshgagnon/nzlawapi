"use strict"
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
var BrowserStore = require('../stores/BrowserStore.js');
var PageStore = require('../stores/PageStore.js');
var PrintStore = require('../stores/PrintStore.js');
var SearchFormStore = require('../stores/SearchFormStore.js');
var Actions = require('../actions/Actions');
var SearchResults = require('./SearchResults.jsx');
var ArticleSideBar = require('./ArticleSideBar.jsx');
var ArticleOverlay = require('./ArticleOverlay.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var JumpTo= require('./JumpTo.jsx');
var Immutable = require('immutable');
var BrowserModals = require('./BrowserModals.jsx');
var AdvancedSearch = require('./AdvancedSearch.jsx');
var TabView = require('./TabView.jsx');
var PrintView = require('./PrintView.jsx');
var UserControls = require('./UserControls.jsx');
var Notifications = require('./Notifications.jsx');
var ContextMenu = require('./ContextMenu.jsx');
var ButtonBar = require('./ButtonBar.jsx');
var Banner = require('./Banner.jsx');
var MQ = require('./Responsive.jsx');
var Tour = require('./Tour.jsx');
var constants = require('../constants');
var Utils = require('../utils');
var ClickOut = require('../mixins/ClickOut')
var ClearInput = require('./ClearInput.jsx');
var HTML5Backend = require('react-dnd/modules/backends/HTML5');
var DragDropContext = require('react-dnd').DragDropContext;
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var EventListener = require('react-bootstrap/lib/utils/EventListener');

var SPLIT_MIN = 768;


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



var Browser = React.createClass({
    mixins: [
        Reflux.listenTo(PageStore, 'onState'),
        Reflux.listenTo(ViewerStore, 'onState'),
        Reflux.listenTo(BrowserStore, 'onState'),
        Reflux.listenTo(PrintStore, 'onState'),
        Reflux.listenTo(SearchFormStore, 'onState'),
        ReactRouter.State,
        UndoMixin,
        ClickOut,
        PureRenderMixin
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
            width: null
        };
    },
    componentDidMount: function(){
        this.__state = {};
        this.aggSetState = _.debounce(function(){
            this.setState(this.__state);
            this.__state = {};
        }.bind(this), 0)

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
        else if(this.context.router.getCurrentParams().edit_id){
            Actions.loadPrevious(['browser'], {browser: {print_mode: true, split_mode: false}});
            Actions.fetchPublished(this.context.router.getCurrentParams().edit_id);
        }
        else{
            Actions.loadPrevious();
        }
        this._window_listener = EventListener.listen(window, 'resize', this.checkWidth);
         this.checkWidth();
    },
    componentDidUpdate: function(){
         this.checkWidth();
    },
    componentDidUnmount: function(){
        this._window_listener.remove();
    },
    checkWidth: function(){
        var width = React.findDOMNode(this).clientWidth;

        if(width !== this.state.width){
            this.setState({width: width}, function(){
                if(this.state.width && this.state.width < SPLIT_MIN){
                    if(this.state.browser.get('split_mode')){
                        Actions.deactivateSplitMode();
                        if(this.state.browser.get('print_mode')){
                            Actions.deactivatePrintMode();
                        }
                    }

                }
            }.bind(this));
        }
    },
    onState: function(state){
        // this will bite us in the ass at some point
        this.__state = _.extend(this.__state, state);
        this.aggSetState();
    },
    submit: function(e){
        e.preventDefault();
        this.fetch();
    },
    submitJumpTo: function(e){
        var page_type = constants.PAGE_TYPES.INSTRUMENT;
        var query = {
                doc_type: this.state.article_type,
                find: 'full',
                document_id: this.state.query || this.state.document_id
            };
        var title = this.state.search_query + ' ' + this.state.jump_to;
        this.open({query: query, title: title, page_type: page_type}, 'tab-0',
            {position: {location: Utils.splitLocation(this.state.jump_to)}});

    },
    submitFocus: function(e){
        var page_type = constants.PAGE_TYPES.INSTRUMENT;
        var query = {
            doc_type: this.state.article_type,
            find: 'location',
            location: this.state.focus,
            document_id: this.state.query || this.state.document_id
        };
        var title = this.state.search_query + ' '+this.state.focus;

        this.open({query: query, title: title, page_type: page_type}, 'tab-0');
    },
    fetch: function(){
        if(!this.state.search_query){
            return;
        }
        var query;
        var title;
        var page_type = constants.PAGE_TYPES.INSTRUMENT;
        if(this.state.document_id){
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
        }
        this.open({query: query, title: title, page_type: page_type}, 'tab-0');
    },
    open: function(page, view, options){
        Actions.newPage(page, view, options);
    },
    handleFormFocus: function(){
        if(this.state.document_id){
            this.setState({show_location: true})
        }
    },
    typeToDocType: function(value){
        return 'instrument';
    },
    handleArticleChange: function(value, callback){
        var self = this;
        // ID means they clicked or hit enter, so focus on next
        this.setState({search_query: value.search_query,
            document_id: value.id, focus: '', jump_to: '',
            article_type: this.typeToDocType(value.type),
            find: value.find,
            show_location: !!value.id,
            query: value.query}, callback);

    },
    handleFocus: function(e){
        e.stopPropagation();
        this.setState({focus: e.target.value});
    },
    handleJumpTo: function(e){
        e.stopPropagation();
        this.setState({jump_to: e.target.value});
    },
    handleFocusEnter: function(e){
        if (e.key === 'Enter') {
            this.submitFocus(e);
            this.prevent(e);
        }
    },
    handleJumpToEnter: function(e){
        if (e.key === 'Enter') {
            this.submitJumpTo(e);
            this.prevent(e);
        }
    },
    clearJumpTo: function(){
        var self = this;
        this.setState({jump_to: null}, function(){
            React.findDOMNode(self.refs.jump_to).focus();
        });
    },
    clearFocus: function(){
        var self = this;
        this.setState({'focus': null}, function(){
            React.findDOMNode(self.refs.focus).focus();
        });
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
        return this.state.show_location;
    },
    getActive: function(tab_id){
        var id = this.state.views.getIn([tab_id ? tab_id : 'tab-0' ,'active_page_id'])
        if(id){
            return this.state.pages.find(function(p){
                return p.get('id') === id;
            });
        }
    },
    canHaveSidebar: function(page){
        return page &&
            (page.get('page_type') ===  constants.PAGE_TYPES.INSTRUMENT
                && ! page.get('error')
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
        return <ArticleSideBar ref="sidebar" article={active} viewer_id={'tab-0'} view={this.state.views.get('tab-0')} />
    },
    overlay: function(active, viewer_id, view){
        return <ArticleOverlay
            page={active}
            viewer_id={viewer_id}
            view={view} />
    },
    clickOutComponent: function(){
        return this.refs.form;
    },
    handleClickOut: function(){
         this.setState({show_location: false});
    },
    bindClickOut: function(){
        return this.state.show_location;
    },
    // NOTE TO SELF:  splitting of render into multiple functions begs to just split component up
    renderBody: function(){
        var active = this.getActive();
        var className = this.state.pages.size > 1 ? ' multi_page' : '';
        if(this.state.browser.get('print_mode') && this.state.browser.get('split_mode') ){
            return <div className={"split print" + className}>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'} showCloseView={true}/>
                <PrintView print={this.state.print} view={this.state.views.get('print')} viewer_id={'print'} key={'print'} showCloseView={true} />
                { this.overlay(active, 'tab-0', this.state.views.get('tab-0')) }
            </div>
        }
        else if(this.state.browser.get('print_mode')){
            return <div className={"print" + className}>
                <PrintView print={this.state.print} view={this.state.views.get('print')} viewer_id={'print'} key={'print'} showCloseView={true} showOpenColumns={this.state.width > SPLIT_MIN} />
            </div>
        }
        else if(this.state.browser.get('split_mode')){
            return <div className={"split" + className}>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'} showCloseView={true}/>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-1')} viewer_id={'tab-1'} key={'tab-1'} showCloseView={true} />
                { this.overlay(active, 'tab-0', this.state.views.get('tab-0')) }
                { this.overlay(this.getActive('tab-1'), 'tab-1', this.state.views.get('tab-1')) }
            </div>
        }
        else if (this.showSidebar(active)){
            return <div className={"sidebar-visible" + className}>
                <TabView browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} key={'tab-0'} />
                { this.sidebar(active)}
                   { this.overlay(active, 'tab-0', this.state.views.get('tab-0')) }
            </div>
        }
        return <div className={className}>
            <TabView key="tabview" browser={this.state.browser} pages={this.state.pages} view={this.state.views.get('tab-0')} viewer_id={'tab-0'} />
                 { this.overlay(active, 'tab-0', this.state.views.get('tab-0')) }
            </div>
    },
    renderLocation: function(){
        return <div className="locations">
            <div className="form-col">
                <div className="input-group has-clear">
                 <input type="text" className="jump_to form-control" placeholder="Jump To..." ref="jump_to" value={this.state.jump_to}
                        onChange={this.handleJumpTo} onKeyPress={this.handleJumpToEnter} />
                    <ClearInput clear={this.clearJumpTo} />
                     <span className="input-group-btn">
                        <Button bsStyle={'info'} onClick={this.submitJumpTo} >Jump To</Button>
                    </span>
                </div>
            </div>
            <div className="form-col">
                <div className="input-group has-clear">
                    <input type="text" className="focus form-control" placeholder="Focus..." ref="focus" value={this.state.focus}
                        onChange={this.handleFocus} onKeyPress={this.handleFocusEnter} />
                    <ClearInput clear={this.clearFocus} />
                     <span className="input-group-btn">
                        <Button bsStyle={'info'} onClick={this.submitFocus} >Focus</Button>
                    </span>
                </div>
            </div>
        </div>
    },
    prevent: function(e){
        e.preventDefault();
        e.stopPropagation()
    },
    renderForm: function(){
        var formClasses = '';
        if(this.showLocation()){
            formClasses += 'showing-location';
        }
        return  <form ref="form" className={formClasses} onFocus={this.handleFormFocus} onSubmit={this.prevent}>
                 <AutoComplete onUpdate={this.handleArticleChange} className='main-search' autoCapitalize="off" autoCorrect="off" submit={this.fetch}
                    search_value={{search_query: this.state.search_query, id: this.state.document_id, type: this.state.article_type }}
                    ref="autocomplete" >
                        <span className="input-group-btn">
                            <button ref="search" className="btn btn-primary" onClick={this.submit} >{ this.showLocation() ? 'Open' : 'Search' }</button>
                        </span>
                     </AutoComplete>
                {  this.showLocation() ? this.renderLocation(): null }
                </form>
    },
    renderDropdown: function(){
        var active = this.getActive();
        return <ButtonBar page={active} page_dialog={this.canHaveSidebar(active)} user_controls={true} viewer_id='tab-0' show_split={false}/>;
    },
    render: function(){
        var active = this.getActive();
        var parentClass ="browser ";
        if(this.state.browser.get('underlines')){
            parentClass += ' underlines';
        }
        if(this.state.browser.get('notes')){
            parentClass += ' notes';
        }
        return (<div className={parentClass}>
                <BrowserModals />
                { this.state.browser.get('page_dialog') ? <PageDialog page={active} viewer_id={'tab-0'} view={this.state.views.get('tab-0')} /> : null }
                <Banner renderDropdown={this.renderDropdown} extraClasses={ this.showLocation() ? ' expanded' : null}>
                    { this.renderForm() }
                    <UserControls />
                </Banner>
            <MQ minWidth={768} maxWidth={991}>
                { this.renderDropdown() }
            </MQ>
            <MQ minWidth={992}>
                <ButtonBar page={active} sidebar={this.canHaveSidebar(active)} viewer_id='tab-0' show_split={this.state.width>SPLIT_MIN}  />
            </MQ>
            { this.renderBody() }
            <Notifications />
            <ContextMenu />
            <Tour />
        </div>);
    }
});

module.exports = DragDropContext(HTML5Backend)(Browser)