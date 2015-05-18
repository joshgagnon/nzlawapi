jest.autoMockOff();

describe('ErrorModal', function() {
    it('Can render ErrorModal with only required properties', function() {
        var React = require('react/addons');
        var ErrorModal = require('../components/ErrorModal.jsx');
        React.addons.TestUtils.renderIntoDocument(
            <ErrorModal />
        );
    });
});
