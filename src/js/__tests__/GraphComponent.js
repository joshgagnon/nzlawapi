jest.autoMockOff();

describe('Graph', function() {
    it('Can render Graph with only required properties', function() {
        var React = require('react/addons');
        var Graph = require('../components/Graph.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <Graph />
        );
    });
});
