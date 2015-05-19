jest.autoMockOff();

describe('JumpTo', function() {
    it('Can render JumpTo with only required properties', function() {
        var React = require('react/addons');
        var JumpTo = require('../components/JumpTo.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <JumpTo />
        );
    });
});
