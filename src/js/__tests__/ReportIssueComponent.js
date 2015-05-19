jest.autoMockOff();

describe('ReportIssue', function() {
    it('Can render ReportIssue with only required properties', function() {
        var React = require('react/addons');
        var ReportIssue = require('../components/ReportIssue.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <ReportIssue />
        );
    });
});
