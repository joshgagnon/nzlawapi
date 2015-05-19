jest.autoMockOff();

describe('TabPane', function() {
    it('Can render TabPane with only required properties', function() {
        var React = require('react/addons');
        var TabPane = require('../components/TabPane.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <TabPane />
        );
    });
});
