jest.autoMockOff();

describe('SplitButton', function() {
    it('Can render SplitButton with only required properties', function() {
        var React = require('react/addons');
        var SplitButton = require('../components/SplitButton.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <SplitButton />
        );
    });
});
