jest.autoMockOff();


describe('Can render browser', function() {
    it('Can create browser component', function() {
        var React = require('react/addons');
        var Browser = require('../components/Browser.jsx');
        var TestUtils = React.addons.TestUtils;
        // Render a checkbox with label in the document
        var browser = TestUtils.renderIntoDocument(
          <Browser />
        );
        expect(browser.getDOMNode()).toBeTruthy(null);
    });
});