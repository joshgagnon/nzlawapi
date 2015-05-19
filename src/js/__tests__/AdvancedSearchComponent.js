jest.autoMockOff();

describe('AdvancedSearch', function() {
    it('Can render AdvancedSearch with only required properties', function() {
        var React = require('react/addons');
        var AdvancedSearch = require('../components/AdvancedSearch.jsx');
        var ViewerStore = require('../stores/ViewerStore.js');
        React.addons.TestUtils.renderIntoDocument(
            <AdvancedSearch view={ViewerStore.getDefaultData()} />
        );
    });
});
