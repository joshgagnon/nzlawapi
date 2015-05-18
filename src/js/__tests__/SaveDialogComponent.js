jest.autoMockOff();

describe('SaveDialog', function() {
    it('Can render SaveDialog with only required properties', function() {
        var React = require('react/addons');
        var SaveDialog = require('../components/SaveDialog.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <SaveDialog.Save />
        );
        React.addons.TestUtils.renderIntoDocument(
            <SaveDialog.Load />
        );
    });
});
