jest.autoMockOff();

describe('UserControls', function() {
    it('Can render UserControls with only required properties', function() {
        var React = require('react/addons');
        var UserControls = require('../components/UserControls.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <UserControls />
        );
    });
});
