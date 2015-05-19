jest.autoMockOff();

describe('Warnings', function() {
    it('Can render Warnings with only required properties', function() {
        var React = require('react/addons');
        var Warnings = require('../components/Warnings.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.NotLatestVersion />
        );
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.ArticleError error="There was an error" />
        );
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.CaseError error="There was an error" />
        );
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.DefinitionError error="There was an error" />
        );
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.SectionReferenceError error="There was an error" />
        );
        React.addons.TestUtils.renderIntoDocument(
            <Warnings.UnknownError />
        );
    });
});
