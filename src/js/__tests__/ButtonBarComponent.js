jest.autoMockOff();

describe('ButtonBar', function() {
    it('Can render ButtonBar with only required properties', function() {
        var React = require('react/addons');
        var ButtonBar = require('../components/ButtonBar.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <ButtonBar />
        );
    });
});
