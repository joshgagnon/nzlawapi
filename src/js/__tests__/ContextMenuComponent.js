jest.autoMockOff();

describe('ContextMenu', function() {
    it('Can render ContextMenu with only required properties', function() {
        var React = require('react/addons');
        var ContextMenu = require('../components/ContextMenu.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <ContextMenu />
        );
    });
});
