var React = require('react');
var Input = require('react-bootstrap/Input');
var $ = require('jquery');

var AutoComplete = React.createClass({
    getInitialState: function() {
        return {
            value: '',
            results: [],
            oldResults: [],
            activeIndex: -1,
        };
    },
    getDefaultProps: function() {
        return {
            endpoint: '/article_auto_complete',
        };
    },
    onChange: function(event) {
        var value = event.target.value;

        this.setState({ value: value });

        if(!value.length) {
            this.setState({ results: [] });
        }
        else {
            $.get(this.props.endpoint, { query: value })
                .then(function(response) {
                    this.setState({ results: response.results });
                }.bind(this));
        }
    },
    onBlur: function() {
        // Delay so that trying to click doesn't clear results immediately
        setTimeout(function() {
            this.setState({ results: [], oldResults: this.state.results });
        }.bind(this), 100);
    },
    onFocus: function() {
        this.setState({ results: this.state.oldResults });
    },
    onKeyDown: function(event) {
        // Handle arrow keys
        var newIndex = this.state.activeIndex;
        if(event.key === 'ArrowDown')
            newIndex++;
        if(event.key === 'ArrowUp')
            newIndex--;

        if(newIndex !== this.state.activeIndex) {
            if(newIndex < -1) newIndex = this.state.results.length - 1;
            if(newIndex >= this.state.results.length) newIndex = 0;

            this.setState({ activeIndex: newIndex });
        }

        // Handle enter key
        if(event.key === 'Enter') {
            if(newIndex > -1) {
                // Choosing an active item from the list
                var selectedText = $(this.getDOMNode()).find('li.active a').text();

                this.setState({
                    value: selectedText,
                    results: [],
                });

                if(this.props.onChoose) {
                    this.props.onChoose(selectedText);
                }
            }
            else {
                // Searching on current text
                if(this.props.onSearch) {
                    this.props.onSearch(this.state.value);
                    this.setState({ results: [] });
                }
            }
        }
    },
    groupCategories: function(results) {
        var groups = [];

        results.forEach(function(result) {
            for(var i = 0; i < groups.length; i++) {
                if(groups[i].type === result.type) {
                    groups[i].entries.push(result);
                    return;
                }
            }
            groups.push({ type: result.type, entries: [result] });
        });

        return groups;
    },
    getResultListItem: function(groupIndex, result, index) {
        var title = result.name;
        var value = this.state.value;

        // Calcuate letter offsets for bolding search query
        var startIndex = title.toLowerCase().indexOf(value.toLowerCase());
        var endIndex = startIndex + value.length;

        // Calculate total index of this result amongst all groups
        var groups = this.groupCategories(this.state.results);
        for(var i = 0; i < groupIndex; i++) {
            index += groups[i].entries.length;
        }

        if(startIndex > -1)
            return <li className={index === this.state.activeIndex ? 'active' : ''} key={result.id}><a href="#">{title.substring(0, startIndex)}<strong>{title.substring(startIndex, endIndex)}</strong>{title.substring(endIndex)}</a></li>;

        return <li key={result.id || undefined}><a href="#">{title}</a></li>;
    },
    clickResult: function(event) {
        var selectedText = $(event.target).closest('a').text();

        this.setState({
            value: selectedText,
            results: [],
        });

        // Initiate action by callback
        if(this.props.onChoose) {
            this.props.onChoose(selectedText);
        }
    },
    render: function() {
        return (
            <div className="autocomplete">
                <Input type="text" value={this.state.value} onChange={this.onChange} onBlur={this.onBlur} onFocus={this.onFocus} onKeyDown={this.onKeyDown} />
                <ul className="results" style={{ display: this.state.results.length ? 'block' : 'none' }}>
                    {
                        this.groupCategories(this.state.results).map(function(group, index) {
                            return (
                                <li key={group.type}>
                                    <h4 className="title">{group.type}</h4>
                                    <ul className="result-group" onClick={this.clickResult}>{group.entries.map(this.getResultListItem.bind(this, index))}</ul>
                                </li>
                            );
                        }.bind(this))
                    }
                </ul>
            </div>
        );
    }
});

module.exports = AutoComplete;
