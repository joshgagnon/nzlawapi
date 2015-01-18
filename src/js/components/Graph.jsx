var React = require('react');
var d3 = require('d3');
var $ = require('jquery');
var events = require('events');

var graph = {
  create: function(el, props, state) {
    var svg = d3.select(el).append('svg')
      .attr('width', props.width)
      .attr('height', props.height);

    svg.append('g')
      .attr('class', 'graph-articles');

    var dispatcher = new events.EventEmitter();

    this.update(el, state, dispatcher);

    return dispatcher;
  },
  update: function(el, state, dispatcher) {
    var articleGroup = d3.select(el).selectAll('.graph-articles');

    var articles = articleGroup.selectAll('.article')
      .data(state.articles);

    // Enter
    articles.enter().append('circle')
      .attr('class', 'article')
      .on('click', function(data, index) {
        dispatcher.emit('graph.article.click', data, index);
      });

    // Update
    articles
      .attr('cx', function(d) { return (d.year - 1900) * 10; })
      .attr('cy', function(d) { return d.y * 400; })
      .attr('r', function(d) { return 10; /* TODO: use incoming edges count, normalised */ });

    // Exit
    articles.exit().remove();

    // The data created is a flattened array of start/end indices, ie [{ start: 0, end: 2 }, { start: 1, end: 5 }]
    var connections = articleGroup.selectAll('.connection')
      .data([].concat.apply([], state.articles.map(function(d, i) {
        return d.references.map(function(e) {
          return { start: i, end: e };
        });
      })));

    // Enter
    connections.enter().append('line')
      .attr('stroke', 'black') // TODO: Remove, use class or dynamic
      .attr('class', 'connection');

    // Update
    // TODO: Share position getters with articles
    connections
      .attr('x1', function(d) { return (state.articles[d.start].year - 1900) * 10; })
      .attr('y1', function(d) { return state.articles[d.start].y * 400; })
      .attr('x2', function(d) { return (state.articles[d.end].year - 1900) * 10; })
      .attr('y2', function(d) { return state.articles[d.end].y * 400; });

    // Exit
    connections.exit().remove();
  },
  destroy: function(el) {
    // Cleanup here if required
  }
};

module.exports = React.createClass({
  propTypes: {
    width: React.PropTypes.string,
    height: React.PropTypes.string,
    articles: React.PropTypes.array,
  },
  getDefaultProps: function() {
    // TODO: Remove these dev defaults, implement fetch from server
    return {
      width: '100%',
      height: '100%',
    };
  },
  getInitialState: function() {
    return {
      // TODO: timestamps/date objects, not year
      articles: []
    };
  },
  dispatcher: null,
  componentDidMount: function() {
    var self = this;

    this.dispatcher = graph.create(this.getDOMNode(), this.props, this.state);

    this.dispatcher.on('graph.article.click', function(data) {
        self.setCentreArticle(data.id);
    });

    // Test fetch - TODO: get from url or let be set by parent state
    this.setCentreArticle(86);
  },
  componentDidUpdate: function() {
    graph.update(this.getDOMNode(), this.state, this.dispatcher);
  },
  componentWillUnmount: function() {
    graph.destroy(this.getDOMNode());
  },
  render: function() {
    return (
      <div className="graph" style={{/*TODO:move to css*/height:'100%'}}></div>
    );
  },
  setCentreArticle: function(id) {
    $.get('/map', {
      id: id,
    })
    .then(function(response) {
      this.setState({
        articles: response.results,
      });
    }.bind(this));
  }
});
