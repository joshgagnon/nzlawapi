var React = require('react');
var d3 = require('d3');
var $ = require('jquery');
var events = require('events');

var graph = {
  xScale: null,
  yScale: null,
  rScale: null,
  sScale: null,
  xAxis: null,
  links: function(d) {
    return d.inbound + d.references.reduce(function(s, r) { return s + r.weight }, 0);
  },
  create: function(el, props, state) {
    var svg = d3.select(el).append('svg')
      .attr('width', props.width)
      .attr('height', props.height);

    // Need seperate groups to maintain draw order as svg has no z-index
    svg.append('g')
      .attr('class', 'graph-connections');
    svg.append('g')
      .attr('class', 'graph-articles');

    svg.append('g')
      .attr('class', 'x-axis axis');

    this.xScale = d3.scale.linear();
    this.yScale = d3.scale.linear();
    this.rScale = d3.scale.linear();
    this.sScale = d3.scale.linear();

    this.xAxis = d3.svg.axis()
      .scale(this.xScale)
      .orient('bottom');

    var dispatcher = new events.EventEmitter();

    this.update(el, state, dispatcher);

    return dispatcher;
  },
  update: function(el, state, dispatcher) {
    var self = this;

    var animLength = 700,
        appearAnimLength = 400;

    var w = el.offsetWidth,
        h = el.offsetHeight;

    // Set up scales
    var xScale = this.xScale;
    xScale.domain(d3.extent(state.articles, function(d) { return d.year; }));
    // Articles can be centered in middle 90% of the graph
    xScale.range([w * 0.05, w * 0.95]);

    var linkExtents = d3.extent(state.articles, this.links);

    var yScale = this.yScale;
    // Default y-sort is the number of inbound + outbound links
    // TODO: sort based on user selection
    yScale.domain(linkExtents);
    // Articles can be centered in middle 90% of the graph
    yScale.range([h * 0.95, h * 0.05]);

    var rScale = this.rScale;
    rScale.domain(linkExtents);
    // TODO: Make this a function of smallest chart dimension
    rScale.range([4, 40]);

    var articleGroup = d3.select(el).selectAll('.graph-articles');

    var articles = articleGroup.selectAll('.article')
      .data(state.articles, function(d) { return d.name; });

    // Enter
    articles.enter().append('circle')
      .attr('class', function(d) { return 'article ' + d.type; })
      .attr('opacity', 0)
      .on('click', function(data, index) {
        dispatcher.emit('graph.article.click', data, index);
      });

    // Update
    articles
      .transition().duration(animLength)
        .attr('opacity', 1)
        .attr('cx', function(d) { return xScale(d.year); })
        .attr('cy', function(d) { return yScale(self.links(d)); })
        .attr('r', function(d) { return rScale(self.links(d)); });

    // Exit
    articles.exit()
      .transition().duration(appearAnimLength)
        .attr('opacity', 0)
        .remove();

    var connectionGroup = d3.select(el).selectAll('.graph-connections');

    // The data created is a flattened array of start/end indices, ie [{ start: 0, end: 2, weight: 10 }, { start: 1, end: 5, weight: 3 }]
    var linkData = [].concat.apply([], state.articles.map(function(d, i) {
      return d.references.map(function(e) {
        // Hash is used for d3 to track animations
        return { start: i, end: e.index, weight: e.weight, hash: d.name + '-' + state.articles[e.index].name };
      });
    }));

    var connections = connectionGroup.selectAll('.connection')
      .data(linkData, function(d) { return d.hash; });

    var sScale = this.sScale;
    sScale.domain(d3.extent(linkData, function(d) { return d.weight; }));
    sScale.range([1, 5]);

    // Enter
    connections.enter().append('line')
      .attr('opacity', 0)
      .attr('stroke-width', function(d) { return sScale(d.weight); })
      .attr('class', 'connection');

    // Update
    connections
      .transition().duration(animLength)
        .attr('opacity', 1)
        .attr('x1', function(d) { return xScale(state.articles[d.start].year); })
        .attr('y1', function(d) { return yScale(self.links(state.articles[d.start])); })
        .attr('x2', function(d) { return xScale(state.articles[d.end].year); })
        .attr('y2', function(d) { return yScale(self.links(state.articles[d.end])); });

    // Exit
    connections.exit()
      .transition().duration(appearAnimLength)
        .attr('opacity', 0)
        .remove();

    // Draw axes
    d3.select(el).select('.x-axis')
      .attr('transform', 'translate(0,' + (h - 21) + ')')
      .transition().duration(animLength)
        .call(this.xAxis);
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
    return {
      width: '100%',
      height: '100%',
    };
  },
  getInitialState: function() {
    return {
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
    this.setCentreArticle(1899);
  },
  componentDidUpdate: function() {
    graph.update(this.getDOMNode(), this.state, this.dispatcher);
  },
  componentWillUnmount: function() {
    graph.destroy(this.getDOMNode());
  },
  render: function() {
    return (
      <div className="graph" style={{/*TODO:move to css*/height:'100%',overflow:'hidden'}}></div>
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
