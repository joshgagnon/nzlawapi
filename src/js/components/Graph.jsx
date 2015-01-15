var React = require('react');
var d3 = require('d3');

var graph = {
  create: function(el, props) {
    var svg = d3.select(el).append('svg')
      .attr('width', props.width)
      .attr('height', props.height);

    svg.append('g')
      .attr('class', 'graph-articles');

    this.update(el, props);
  },
  update: function(el, props) {
    var articleGroup = d3.select(el).selectAll('.graph-articles');

    var articles = articleGroup.selectAll('.article')
      .data(props.articles);

    // Enter
    articles.enter().append('circle')
      .attr('class', 'article');

    // Update
    articles
      .attr('cx', function(d) { console.log(d); return (d.year - 2000) * 20; })
      .attr('cy', function(d) { return d.relevance * 200; })
      .attr('r', function(d) { return 10; /* TODO: use incoming edges count, normalised */ });

    // Exit
    articles.exit().remove();

    // The data created is a flattened array of start/end indices, ie [{ start: 0, end: 2 }, { start: 1, end: 5 }]
    var connections = articleGroup.selectAll('.connection')
      .data([].concat.apply([], props.articles.map(function(d, i) {
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
      .attr('x1', function(d) { return (props.articles[d.start].year - 2000) * 20; })
      .attr('y1', function(d) { return props.articles[d.start].relevance * 200; })
      .attr('x2', function(d) { return (props.articles[d.end].year - 2000) * 20; })
      .attr('y2', function(d) { return props.articles[d.end].relevance * 200; });

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
      width: '400px',
      height: '300px',
      // TODO: timestamps/date objects, not year
      articles: [
        { name: 'act_2', title: 'I am act 2', type: 'act', year: '2014', relevance: 1.0, references: [1, 2] },
        { name: 'act_4', title: 'Act 4', type: 'act', year: '2012', relevance: 0.2, references: [2] },
        { name: 'regulation_7', title: 'Regulation 7', year: '2009', relevance: 0.5, type: 'regulation', references: [] },
      ]
    };
  },
  componentDidMount: function() {
    graph.create(this.getDOMNode(), this.props);
  },
  render: function() {
    return (
      <div className="graph"></div>
    );
  }
});
