jest.autoMockOff();

describe('GraphModal', function() {
    it('Can render GraphModal with only required properties', function() {
        var React = require('react/addons');
        var GraphModal = require('../components/GraphModal.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <GraphModal onRequestHide={function(){}} />
        );
    });
});
