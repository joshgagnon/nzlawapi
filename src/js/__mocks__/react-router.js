var router = jest.genMockFromModule('react-router')
//jest.dontMock('../components/Browser.jsx');
//router.getState = function(){ return {};

router.State = {getParams: function(){ return {};}};

module.exports = router;