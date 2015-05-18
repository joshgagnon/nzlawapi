jest.autoMockOff();

describe('Notifications', function() {
    it('Can render Notifications with only required properties', function() {
        var React = require('react/addons');
        var Notifications = require('../components/Notifications.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <Notifications />
        );
    });
});
