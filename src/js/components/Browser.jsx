var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Reflux = require('reflux');
var ReactRouter = require('react-router');
var Input = require('react-bootstrap/Input');
var Button = require('react-bootstrap/Button');
var ResultStore = require('../stores/ResultStore');
var Serialization = require('../stores/Serialization.js');
var Actions = require('../actions/Actions');
var Glyphicon= require('react-bootstrap/Glyphicon');
var SearchResults = require('./SearchResults.jsx');
var AutoComplete = require('./AutoComplete.jsx');
var TabbedArea = require('./TabbedArea.jsx');
var TabPane = require('./TabPane.jsx');
var Article = require('./Article.jsx');
var ArticleScrollSpy = require('./ArticleScrollSpy.jsx');
var AdvancedSearch = require('./AdvancedSearch.jsx');
var SaveDialog = require('./SaveDialog.jsx')



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


module.exports = React.createClass({
    mixins: [
        Reflux.listenTo(ResultStore, 'onResults'),
        Reflux.listenTo(DialogStore, 'onDialog'),
        React.addons.LinkedStateMixin,
        ReactRouter.State
    ],
    getInitialState: function(){
        return {
            results: [],
            advanced_search: false,
            underlines: false,
            save_dialog: false,
            load_dialog: false
        };
    },
    componentDidMount: function(){
        if(this.getParams().query === 'query' && !_.isEmpty(this.getQuery())){
            Actions.newResult({query: this.getQuery(), title: this.getQuery.title});
        }
        else if(this.getParams().type){
            Actions.newResult({query: {type: this.getParams().type,  query: this.getParams().id, find: 'id'}});
        }
    },
    onResults: function(data){
        var active_result, active;
        active_result = _.find(data.results, function(d){ return d.active}) || data.results[0];
        if(active_result){
            active = active_result.id;
        }
        this.setState({results: data.results, active: active, active_result: active_result});
    },
    onDialog: function(state){
        this.setState(state);
    },
    submit: function(e){
        e.preventDefault();
        this.fetch();
    },
    fetch: function(){
        console.log(this.state)
        if(!this.state.search_query){
            return;
        }
        this.setState({
            loading: true
        });
        var query;
        var title;
        if(this.state.document_id){
            query = {
                type: this.state.article_type,
                find: !this.state.location ? 'full' : 'location',
                query: this.state.location,
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
        Actions.newResult({query: query, title: title});
    },
    handleArticleChange: function(value){
        var self = this;
        // ID means they clicked or hit enter, so focus on next
        this.setState({search_query: value.search_query, document_id: value.id, article_type: value.type}, function(){
            if(value.id){
                // hack!
                setTimeout(function(){
                    $(self.refs.autocomplete.getInputDOMNode()).focusNextInputField();
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
        Actions.clearResults();
    },
    handleTab: function(active){
        if(active !== this.state.active){
            Actions.activateResult(_.find(this.state.results, function(d){ return d.id === active}));
        }
    },
    closeTab: function(id){
        var result = _.find(this.state.results, function(d){ return d.id === id});
        Actions.removeResult(result);
    },
    renderResult: function(result){
        if(result.content){
            return result.query.search ?
                    <SearchResults key={result.id} result={result}  popupContainer='.act_browser' /> :
                    <Article key={result.id} result={result}  popupContainer='.act_browser' />
        }
        else{
            return <div className="search-results csspinner traditional"/>;
        }
    },
    renderTabs: function(results){
        var self = this;
        return (<TabbedArea activeKey={this.state.active} onSelect={this.handleTab} onClose={this.closeTab}>
                { this.state.results.map(function(result){
                        return (
                             <TabPane key={result.id} eventKey={result.id} tab={result.title} >
                                { self.renderResult(result) }
                            </TabPane>
                          )
                      })
            }
            </TabbedArea>)
    },
    toggleState: function(state){
        var s = {};
        s[state] = !this.state[state]
        this.setState(s);
    },
    renderBody: function(){
        var self = this;
        if(this.state.results.length > 1){
            if(this.state.split_mode){
                return (<div><Col md={6} >{this.renderTabs()}</Col> <Col md={6} >{this.renderTabs()}</Col></div>)
            }
            return  this.renderTabs();
        }
        else if(this.state.results.length == 1){
            return  this.renderResult(this.state.results[0]);
        }
    },
    render: function(){
        console.log(this.state)
        var formClasses = "navbar-form navbar-left ";
        var show_side_bar =  this.state.active_result && this.state.active_result.content && !this.state.active_result.query.search;
        if(this.state.document_id){
            formClasses += 'showing-location';
        }
        var parentClass ="act_browser ";
        if(show_side_bar){
            parentClass += 'sidebar-visible ';
        }
        if(this.state.underlines){
            parentClass += 'underlines ';
        }
        return (<div className className={parentClass}>
                <div className="container-fluid">
                { this.state.advanced_search ? <AdvancedSearch /> : null }

                { this.state.save_dialog ? <SaveDialog.Save /> : null }
                { this.state.load_dialog ? <SaveDialog.Load /> : null }
                 <nav className="navbar navbar-default navbar-fixed-top">

                    <div className="navbar-header">
                      <a className="navbar-brand hidden-xs" href="#">
                           <img src="/build/images/logo-colourx2.png" alt="CataLex" className="logo img-responsive center-block"/>
                         </a>
                    </div>
                        <form className={formClasses}>
                             <AutoComplete endpoint="/article_auto_complete" onUpdate={this.handleArticleChange} onSubmit={this.submit}
                                search_value={{search_query: this.state.search_query, id: this.state.document_id, type: this.state.article_type }}
                                appendToSelf={true} ref="autocomplete"
                                buttonAfter={
                                    <div className="btn-group">
                                        <Button type="input" bsStyle="primary" onClick={this.submit} >Search</Button>
                                     <Button type="button" bsStyle="primary" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                      <span className="caret"></span>
                                      <span className="sr-only">Toggle Dropdown</span>
                                    </Button>
                                    <ul className="dropdown-menu" role="menu">
                                        <li><a href="#">Search All</a></li>
                                        <li><a href="#">Search Acts</a></li>
                                        <li><a href="#">Search Regulations</a></li>
                                        <li><a href="#">Search Cases</a></li>
                                        <li className="divider"></li>
                                        <li><a href="#" onClick={this.toggleAdvanced}>Advanced Search</a></li>
                                      </ul>
                                    </div>
                            } >
                            { this.state.document_id ? <Input type="text" className="location" placeholder="Location..." value={this.state.location} onChange={this.handleLocation}
                                ref="location"  /> : <Input/> }
                            </AutoComplete>
                        </form>
                   </nav>
                </div>
            <div className="sidebar-wrapper">
                <a><Glyphicon glyph="search" onClick={this.toggleState.bind(this, 'advanced_search')} title="Advanced Search"/></a>
                <a><Glyphicon glyph="text-color" onClick={this.toggleState.bind(this, 'underlines')} title="Underlines"/></a>
                <a><Glyphicon glyph="floppy-open" onClick={this.toggleState.bind(this, 'load_dialog')} title="Open"/></a>
                <a><Glyphicon glyph="floppy-save" onClick={this.toggleState.bind(this, 'save_dialog')} title="Save"/></a>
                <a><Glyphicon glyph="print" title="Print"/></a>
                <a><Glyphicon glyph="star" /></a>
                {/*<ModalTrigger modal={<GraphModal />}>
                    <a><Glyphicon glyph="globe" /></a>
                </ModalTrigger>*/}
                <a onClick={this.reset}><Glyphicon glyph="trash" title="Reset"/></a>
            </div>
            <div className="container-wrapper">
                <div className="results">
                    {this.renderBody() }
                </div>
            </div>
            { show_side_bar ?
            <div className="contents-bar-wrapper navbar-default visible-md-block visible-lg-block">
                <ArticleScrollSpy html={this.state.active_result.content.html_contents_page} result={this.state.active_result} />  : null
            </div> : null }
        </div>);
    }
});