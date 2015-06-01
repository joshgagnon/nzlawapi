var React = require('react/addons');
var Input = require('react-bootstrap/lib/Input');
var ClickOut = require('../mixins/ClickOut');
var _ = require('lodash');
var request = require('../catalex-request');
var ClearInput = require('./ClearInput.jsx');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var AutoComplete = React.createClass({
    propTypes: {
        search_value: React.PropTypes.object.isRequired
    },
    mixins: [ClickOut,PureRenderMixin],
    getInitialState: function() {
        return {
            show: false,
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
                    self._fetching = false;
                    self.bindRootCloseHandlers();

                    self.setState({
                        results: response.body.results,
                        groups: self.groupCategories(response.body.results)
                    });
                });
        }, 250);
    },
    onChange: function(event) {
        /* if typing, it means no autocomplete article was selected */
        if(React.findDOMNode(this.refs.search) === event.target){
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
                this._fetching = true;
                this.debounceFetch(value);
            }
            this.setState({
                activeIndex: -1
            });
        }
    },
    clickOutComponent: function(){
        return this;
    },
    handleClickOut: function(){
         this.setState({show: false});
    },
    bindClickOut: function(){
        return this.state.results.length
    },
    componentDidUpdate: function(){
        if(this.refs.dropdown){
            var dropdownElement = React.findDOMNode(this.refs.dropdown);
            var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            dropdownElement.style.maxHeight = (windowHeight - dropdownElement.getBoundingClientRect().top - 15) + 'px';
        }
    },
    onFocus: function(e) {
        if(e.target === this.getInputDOMNode() && !this.props.search_value.id && this.props.search_value.search_query){
            this.setState({show: true});
        }
    },
    onBlur: function(e){
        this.setState({show: false});
    },
    onKeyDown: function(event) {
        // Handle arrow keys
        var newIndex = this.state.activeIndex;
        if (event.key === 'ArrowDown'){
            newIndex++;
        }
        else if (event.key === 'ArrowUp'){
            newIndex--;
        }
        if (newIndex !== this.state.activeIndex) {
            if (newIndex < -1){
                    newIndex = this.state.results.length - 1;
            }
            if (newIndex >= this.state.results.length){
                newIndex = 0;
            }
            this.setState({
                activeIndex: newIndex
            });
        }
        // Handle enter key

        if (event.key === 'Enter' || (this.state.show && event.key === 'Tab')) {
            if(!this.state.show || newIndex === -1){
                // submit
                this.props.submit();
            }
            else if(newIndex > -1) {
                 event.preventDefault();
                event.stopPropagation();
                // Choosing an active item from the result list
                this.clickResult(this._results[newIndex]);
            }
            else {
                 event.preventDefault();
                // If this is an exact match we already know about search it directly
                var search_query = this.props.search_value.search_query.trim().toLowerCase();
                var matched_results = this.state.results.filter(function(result) {
                    return result.name.trim().toLowerCase() === search_query;
                });
                if(matched_results.length) {
                    event.stopPropagation();
                    this.clickResult(matched_results[0]);
                }
            }
            this.setState({ show: false });
        }
        if (event.key === 'Escape'){
            this.setState({ show: false });
        }
    },
    groupCategories: function(results) {
        var groups = [];
        var self = this;
        this._results = []
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
        });
        groups.forEach(function(group){
            group.entries.forEach(function(result){
                 self._results.push(result);
            });
        })

        return groups;
    },
    getHighlight: function(index, title, startIndex, endIndex){
        return <a href="#" data-doc-id={index}>
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
                    { startIndex > -1 ? this.getHighlight(result.id, title, startIndex, endIndex) :
                        <a href="#" data-doc-id={result.id}>{ title }</a> }
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
        return React.findDOMNode(this.refs.search);
    },
    clearSearch: function(){
        var self = this;
        this.props.onUpdate({
            search_query: null,
            id: null,
            type: null
        }, function(){
             React.findDOMNode(self.refs.search).focus();
        });
    },
    render: function() {
        console.log('redner')
        var but_children = _.omit(this.props, 'children', 'className');
        return (
            <div className="autocomplete input-group">
                <div className="input-group has-clear">
                    <input className={"form-control "+(this.props.className||'')} type="text" placeholder="Search..." ref="search" value={this.props.search_value.search_query}
                        onChange={this.onChange} onBlur={this.onBlur} onFocus={this.onFocus} onKeyDown={this.onKeyDown} {...but_children}/>
                            <ClearInput clear={this.clearSearch} />
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
    componentWillUnmount: function(){
        this.unbindRootCloseHandlers();
    }
});

module.exports = AutoComplete;
