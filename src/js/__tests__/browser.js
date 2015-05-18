jest.autoMockOff();

// TODO: Use React.PropTypes.instanceOf(Immutable) for pages etc

describe('Render components', function() {
    // TODO: Needs summary=PageStore.pages[i].getIn(['content','attributes'])
    // it('Can render ArticleSummary with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleSummary = require('../components/ArticleSummary.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleSummary />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i] where page has content.search_results.hits[].data
    // it('Can render ContainsList with only required properties', function() {
    //     var React = require('react/addons');
    //     var ContainsList = require('../components/ContainsList.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ContainsList />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i] where page has id + query
    // it('Can render Search with only required properties', function() {
    //     var React = require('react/addons');
    //     var Search = require('../components/Search.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Search />
    //     );
    // });

    // TODO: Is this updated and used at all? Only instantiated in Validator
    // it('Can render TypeAhead with only required properties', function() {
    //     var React = require('react/addons');
    //     var TypeAhead = require('../components/TypeAhead.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <TypeAhead />
    //     );
    // });

    // TODO: Is actually a mixin, should move
    // it('Can render ArticleHandlers with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleHandlers = require('../components/ArticleHandlers.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleHandlers />
    //     );
    // });

    // TODO: Needs an article
    // it('Can render ArticleVersions with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleVersions = require('../components/ArticleVersions.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleVersions />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i] where page has id + query
    // it('Can render ContainsResult with only required properties', function() {
    //     var React = require('react/addons');
    //     var ContainsResult = require('../components/ContainsResult.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ContainsResult />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i] where page has content.search_results.hits[].data
    // it('Can render SearchResults with only required properties', function() {
    //     var React = require('react/addons');
    //     var SearchResults = require('../components/SearchResults.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <SearchResults />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i] where page has content.search_results.hits[].data
    // it('Can render ArticleInfoTabs with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleInfoTabs = require('../components/ArticleInfoTabs.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleInfoTabs />
    //     );
    // });

    // TODO: Even more props required
    // it('Can render Popover with only required properties', function() {
    //     var React = require('react/addons');
    //     var Popover = require('../components/Popover.jsx');
    //     // TODO: Should MobilePopover be factored into its own file via mixins?
    //     var immut = {get:function(){return 0;}};
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Popover.Popover popoverView={immut} popoverPage={immut} getScrollContainer={function(){}} />
    //     );
    // });

    // TODO: Needs page=PageStore.pages[i]
    // it('Can render SectionReferences with only required properties', function() {
    //     var React = require('react/addons');
    //     var SectionReferences = require('../components/SectionReferences.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <SectionReferences />
    //     );
    // });

    // TODO: Is this updated and used at all?
    // it('Can render Validator with only required properties', function() {
    //     var React = require('react/addons');
    //     var Validator = require('../components/Validator.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Validator />
    //     );
    // });

    // it('Can render Article with only required properties', function() {
    //     var React = require('react/addons');
    //     var Article = require('../components/Article.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Article />
    //     );
    // });

    // TODO: content = {query:{},title:''}
    // it('Can render BreadCrumbs with only required properties', function() {
    //     var React = require('react/addons');
    //     var BreadCrumbs = require('../components/BreadCrumbs.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <BreadCrumbs />
    //     );
    // });

    // TODO: page
    // it('Can render Definition with only required properties', function() {
    //     var React = require('react/addons');
    //     var Definition = require('../components/Definition.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Definition />
    //     );
    // });

    // TODO: sectionView
    // it('Can render SectionSummary with only required properties', function() {
    //     var React = require('react/addons');
    //     var SectionSummary = require('../components/SectionSummary.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <SectionSummary />
    //     );
    // });

    // TODO: page
    // it('Can render ArticleOverlay with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleOverlay = require('../components/ArticleOverlay.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleOverlay />
    //     );
    // });

    // !
    // it('Can render Browser with only required properties', function() {
    //     var React = require('react/addons');
    //     var Browser = require('../components/Browser.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Browser />
    //     );
    // });

    // TODO: page
    // it('Can render DefinitionSearch with only required properties', function() {
    //     var React = require('react/addons');
    //     var DefinitionSearch = require('../components/DefinitionSearch.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <DefinitionSearch />
    //     );
    // });

    // TODO: Figure out dependencies
    // it('Can render PrintView with only required properties', function() {
    //     var React = require('react/addons');
    //     var PrintView = require('../components/PrintView.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <PrintView />
    //     );
    // });

    // TODO: article
    // it('Can render ArticleReferences with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleReferences = require('../components/ArticleReferences.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleReferences />
    //     );
    // });

    // TODO: lots of properties
    // it('Can render TabbedArea with only required properties', function() {
    //     var React = require('react/addons');
    //     var TabbedArea = require('../components/TabbedArea.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <TabbedArea />
    //     );
    // });

    // TODO: Needs article
    // it('Can render ArticleScrollSpy with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleScrollSpy = require('../components/ArticleScrollSpy.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleScrollSpy />
    //     );
    // });

    // TODO: lots
    // it('Can render Case with only required properties', function() {
    //     var React = require('react/addons');
    //     var Case = require('../components/Case.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Case />
    //     );
    // });

    // TODO: Is this code used anywhere?
    // it('Can render Responsive with only required properties', function() {
    //     var React = require('react/addons');
    //     var Responsive = require('../components/Responsive.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <Responsive />
    //     );
    // });

    // TODO: Appears to only by a wrapper around ArticleInfoTabs, test as such
    // it('Can render ArticleSideBar with only required properties', function() {
    //     var React = require('react/addons');
    //     var ArticleSideBar = require('../components/ArticleSideBar.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <ArticleSideBar />
    //     );
    // });

    // TODO: view and pages
    // it('Can render TabView with only required properties', function() {
    //     var React = require('react/addons');
    //     var TabView = require('../components/TabView.jsx');
    //     React.addons.TestUtils.renderIntoDocument(
    //         <TabView />
    //     );
    // });
});
