jest.autoMockOff();

describe('AutoComplete', function() {
    it('Can render AutoComplete with only required properties', function() {
        var React = require('react/addons');
        var AutoComplete = require('../components/AutoComplete.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <AutoComplete search_value={{}} />
        );
    });
});
