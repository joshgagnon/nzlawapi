var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var EventListener = require('react-bootstrap/lib/utils/EventListener');
var $ = require('jquery');
var _ = require('lodash');
var request = require('../catalex-request');
// TODO, scroll overflow on arrows

var AutoComplete = React.createClass({
    getInitialState: function() {
        return {
            results: [],
            activeIndex: -1,
        };
    },
    getDefaultProps: function() {
        return {
            endpoint: '/article_auto_complete',
        };
    },
    componentDidMount: function(){
        var self = this;
        this.debounceFetch = _.debounce(function(value){
             request.get(self.props.endpoint, {
                    query: value
                })
             .promise()
             .then(function(response){
                    self.bindRootCloseHandlers();
                    self.setState({
                        results: response.body.results,
                        groups: self.groupCategories(response.body.results)
                    });
                });
        }, 250)
    },
    onChange: function(event) {
        /* if typing, it means no autocomplete article was selected */
        if(this.refs.search.getDOMNode() === event.target){
            var value = event.target.value;
            this.props.onUpdate({
                search_query: value,
                id: null,
                type: null
            });
            if(!this.state.show){
                this.setState({show: true});
            }
            if (!value.length) {
                this.setState({
                    results: []
                });
            } else {
                this.debounceFetch(value);
            }
        }
    },
    handleDocumentClick: function(e) {
        // If the click originated from within this component
        // don't do anything.
        if (React.findDOMNode(this).contains(e.target)) {
            return;
        }
        this.setState({show: false});
    },
    bindRootCloseHandlers: function() {
        this._onDocumentClickListener =
            EventListener.listen(document, 'click', this.handleDocumentClick);
    },
    unbindRootCloseHandlers: function() {
        if (this._onDocumentClickListener) {
            this._onDocumentClickListener.remove();
            this._onDocumentClickListener = null;
        }
    },
    componentDidUpdate: function(){
        if(!this.state.show){
            this.unbindRootCloseHandlers();
        }
    },
    onFocus: function(e) {
        if(e.target === this.getInputDOMNode()){
            this.setState({show: true});
        }
    },
    onBlur: function(e){
        this.setState({show: false});
    },
    onKeyDown: function(event) {
        // Handle arrow keys
        var newIndex = this.state.activeIndex;
        if (event.key === 'ArrowDown')
            newIndex++;
        if (event.key === 'ArrowUp')
            newIndex--;

        if (newIndex !== this.state.activeIndex) {
            if (newIndex < -1) newIndex = this.state.results.length - 1;
            if (newIndex >= this.state.results.length) newIndex = 0;

            this.setState({
                activeIndex: newIndex
            });
        }
        // Handle enter key
        if (event.key === 'Enter' || event.key === 'Tab') {
            if (newIndex > -1) {
                // Choosing an active item from the list
                var a = $(this.getDOMNode()).find('li.active a');
                var selectedText = a.text();

                this.setState({
                    results: []
                });
                this.clickResult(this.getResultById(a.attr('data-doc-id')|0));
            } else {
                // Searching on current text
               /* if (this.props.onSubmit) {
                    this.props.onSubmit();
                    this.setState({
                        results: []
                    });
                }*/
            }
            this.setState({show: false})
        }
    },
    getResultById: function(id){
        return _.find(this.state.results, {id: id});
    },
    groupCategories: function(results) {
        var groups = [];
        results.forEach(function(result) {
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].type === result.type) {
                    groups[i].entries.push(result);
                    return;
                }
            }
            groups.push({
                type: result.type,
                entries: [result]
            });
        });
        var order = ['bill', 'case', 'regulation','act'];
        groups.sort(function(a ,b){
            return order.indexOf(b.type)- order.indexOf(a.type)
        })
        return groups;
    },
    getHighlight: function(title, startIndex, endIndex){
        return <a href="#">
                     { title.substring(0, startIndex)  }
                    <strong>{
                        title.substring(startIndex, endIndex)}
                    </strong>
                    {title.substring(endIndex)}</a>
    },
    getResultListItem: function(groupIndex, result, index) {
        var title = result.name;
        var value = (this.props.search_value.search_query ||'').trim();

        var max_length = 75;
        if(title.length > max_length){
            //title = title.substring(0, Math.floor(max_length/2)) + '\u2026' + title.substring(title.length-Math.ceil(max_length/2)-1)
        }
        // Calcuate letter offsets for bolding search query

        var startIndex = title.toLowerCase().indexOf(value.toLowerCase());
        var endIndex = startIndex + value.length;

        // Calculate total index of this result amongst all groups
        var groups = this.state.groups;
        for (var i = 0; i < groupIndex; i++) {
            index += groups[i].entries.length;
        }
        return <li className={index === this.state.activeIndex ? 'active' : ''} onMouseDown={ this.clickResult.bind(this, result) }
                    key={result.id}>
                    { startIndex > -1 ? this.getHighlight(title, startIndex, endIndex) :
                        <a href="#" >{ title }</a> }
                </li>;
    },
    clickResult: function(result) {
        this.props.onUpdate({
            id: result.id,
            type: result.type,
            search_query: result.name,
            query: result.query,
            find: result.find,
            show: false
        });

    },

    getInputDOMNode: function(){
        return this.refs.search.getDOMNode();
    },
    render: function() {
        var but_children = _.omit(this.props, 'children', 'className');
        return (
            <div className="autocomplete input-group">
                <div className="input-group">
                <input className={"form-control "+(this.props.className||'')} type="text" placeholder="Search..." ref="search" value={this.props.search_value.search_query}
                    onChange={this.onChange} onBlur={this.onBlur} onFocus={this.onFocus} onKeyDown={this.onKeyDown} {...but_children}/>
                       { this.props.children }
                    </div>
                { this.state.show && this.state.results.length ?
                <ul className="results" ref="dropdown">
                    {
                        this.state.groups.map(function(group, index) {
                            return (
                                <li key={group.type}>
                                    <h4 className="title">{group.type}</h4>
                                    <ul className="result-group">{group.entries.map(this.getResultListItem.bind(this, index))}</ul>
                                </li>
                            );
                        }.bind(this))
                    }
                </ul> : null }

            </div>
        );
    },
    componentDidUpdate: function(props, state){
        if(this.refs.dropdown){
            $(this.refs.dropdown.getDOMNode()).css('max-height', $(window).height() - 60);
        }
        if(!this.state.results.length && this._onDocumentClickListener){
            this.unbindRootCloseHandlers();
        }
        else if(this.state.results.length && !this._onDocumentClickListener){
            this.bindRootCloseHandlers();
        }
    },
    componentWillUnmount: function(){
        this.unbindRootCloseHandlers();
    }
});

module.exports = AutoComplete;
