"use strict";
var React = require('react/addons');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');

var Reflux = require('reflux');
var FormStore = require('../stores/FormStore');
var ArticleStore = require('../stores/ArticleStore');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var $ = require('jquery');
var Popover = require('./Popover.jsx');
var SectionSummary = require('./SectionSummary.jsx');
var ArticleOverlay= require('./ArticleOverlay.jsx');
var MQ = require('react-responsive');
var NotLatestVersion = require('./Warnings.jsx').NotLatestVersion;
var ArticleError = require('./Warnings.jsx').ArticleError;
var Perf = React.addons.Perf;

var ArticleJumpStore = Reflux.createStore({
    listenables: Actions,
    init: function(){

    },
    onArticleJumpTo: function(result, jump){
        this.trigger(result, jump);
    }
});

function stopPropagation(e){
    e.stopPropagation();
}


$.fn.isOnScreen = function(tolerance){
    tolerance = tolerance || 0;
    var viewport = {};
    viewport.top = $(window).scrollTop();
    viewport.bottom = viewport.top + $(window).height();
    var bounds = {};
    bounds.top = this.offset().top;
    bounds.bottom = bounds.top + this.outerHeight();
    return ((bounds.top <= viewport.bottom + tolerance) && (bounds.bottom >= viewport.top - tolerance));
};

function getLocationString($el){
    var result = ''
    if(!$el.attr('data-location-no-path')){
        result = $el.parents('[data-location]').not('[data-location-no-path]').map(function(){
            return $(this).attr('data-location');
        }).toArray().reverse().join('');
    }
    result += $el.attr('data-location') || '';
    return result;
}

// TODO, break into popovers, and article,
// return false on equality

var ArticleContent = React.createClass({
    mixins: [
        Reflux.listenTo(ArticleJumpStore, "onJumpTo"),
        /*     mixins: [Reflux.connectFilter(postStore,"post", function(posts) {
        posts.filter(function(post) {
           post.id === this.props.id;
        });
    }], */
    ],
    scroll_threshold: 4000,
    propTypes: {
       content: React.PropTypes.object.isRequired,
    },
    getInitialState: function(){
        this.heights= {};
        this.heights = {"0":375,"1":80,"2":851,"3":1121,"4":741,"5":1625,"6":572,"7":2044,"8":1299,"9":1266,"10":118,"11":1241,"12":603,"13":898,"14":963,"15":1367,"16":1379,"17":2513,"18":1657,"19":1857,"20":1832,"21":2526,"22":1435,"23":1114,"24":1554,"25":1836,"26":1497,"27":1148,"28":2295,"29":819,"30":1861,"31":620,"32":2284,"33":1526,"34":1608,"35":2267,"36":1589,"37":888,"38":1917,"39":1251,"40":1356,"41":1864,"42":1736,"43":659,"44":2022,"45":2092,"46":1180,"47":1402,"48":1131,"49":1330,"50":1516,"51":1564,"52":1354,"53":1230,"54":1507,"55":1896,"56":654,"57":924,"58":1198,"59":1289,"60":1852,"61":1291,"62":1644,"63":1619,"64":1545,"65":777,"66":1369,"67":516,"68":2293,"69":2426,"70":1365,"71":823,"72":1921,"73":2113,"74":720,"75":1685,"76":546,"77":373,"78":2142,"79":921,"80":648,"81":1342,"82":1052,"83":1289,"84":1588,"85":743,"86":1534,"87":1171,"88":930,"89":1008,"90":1454,"91":1028,"92":1634,"93":212,"94":535,"95":1882,"96":990,"97":1598,"98":1803,"99":1582,"100":1634,"101":451,"102":506,"103":1431,"104":402,"105":1695,"106":322,"107":1350,"108":1313,"109":1536,"110":303,"111":336,"112":1623,"113":902,"114":1647,"115":326,"116":586,"117":1990,"118":1944,"119":2265,"120":2306,"121":1755,"122":1933,"123":1481,"124":1363,"125":2322,"126":1463,"127":1368,"128":66,"129":810,"130":2056,"131":1512,"132":1506,"133":398,"134":1557,"135":166,"136":1147,"137":1513,"138":2531,"139":1478,"140":2043,"141":3179,"142":1631,"143":1622,"144":1394,"145":1097,"146":155,"147":1192,"148":118,"149":1347,"150":1558,"151":1309,"152":1742,"153":512,"154":1267,"155":1802,"156":1316,"157":695,"158":1240,"159":1440,"160":213,"161":1254,"162":1589,"163":2124,"164":2125,"165":886,"166":893,"167":1829,"168":65,"169":456,"170":1639,"171":1292,"172":1728,"173":1421,"174":66,"175":142,"176":1424,"177":154,"178":1059,"179":1582,"180":1335,"181":2154,"182":1697,"183":88,"184":1280,"185":1959,"186":1398,"187":676,"188":1148,"189":88,"190":1133,"191":268,"192":781,"193":88,"194":1547,"195":1938,"196":844,"197":106,"198":1605,"199":33,"200":670,"201":1360,"202":1904,"203":447};
        return {visible: {}};
    },
    componentDidMount: function(){
        this.setup_scroll();
        if(this.isPartial()){
            this.resizeSkeleton();
            this.checkSubVisibility();
        }
    },
    componentDidUpdate: function(){
        if(this.isPartial()){
            this.resizeSkeleton();
        }
    },
    isPartial: function(){
        return this.props.content.get('format') === 'skeleton';
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container');
    },
    setup_scroll: function(){
        this.offset = 100;
        var self = this;
        this.refresh();
        var find_current = function(store){
            var top = self.getScrollContainer().scrollTop();
            var i = _.sortedIndex(store.offsets, top) -1;
            return store.targets[Math.min(Math.max(0, i), store.targets.length -1)];
        };
        this.throttle_visibility = _.throttle(this.checkSubVisibility, 300)
        this.debounce_scroll = _.debounce(function(){
            if(self.isMounted()){
                var offset = self.getScrollContainer().offset().top;
                if(self.scrollHeight !== $(self.getDOMNode()).height()){
                    self.refresh();
                }
                var $el = $(find_current(self.locations));
                var result = getLocationString($el)
                var id = $el.closest('div.part[id], div.subpart[id], div.schedule[id], div.crosshead[id], div.prov[id], .case-para[id], .form[id]').attr('id');
                if(result){
                    Actions.articlePosition({pixel: $(self.getDOMNode()).parents('.tab-content, .results-container').scrollTop() + self.offset, repr: result, id: id});
                }
            }
            }, 0);
        var $parent = this.getScrollContainer();
        //$parent.on('scroll', this.debounce_scroll);
        if(this.isPartial()){
            this.checkSubVisibility();
            $parent.on('scroll',  this.throttle_visibility);
            //$parent.on('touchmove', this.debounce_visibility);
           // $(window).on('resize', this.reset_heights);
        }
    },
    reset_heights: function(){
        this.heights = {};
    },
    calculate_height: function(count, width){
        return 500;
    },
    resizeSkeleton: function(){
        var self = this;
        _.each(self.refs, function(v, k){
            if(self.props.content.getIn(['parts', k])){
                self.heights[k] = v.getDOMNode().clientHeight;
            }
        });
        //console.log(JSON.stringify(this.heights))
    },
    checkSubVisibility: function(){
        if(this.isMounted()){
            var self = this;
            var visible = {};
            var top = this.getScrollContainer().scrollTop();
            var height = this.getScrollContainer().height();
            var change = false;
            _.each(this.refs, function(r, k){
                if($(r.getDOMNode()).isOnScreen(self.scroll_threshold)){
                    visible[k] = true;
                }else{
                    visible[k] = false;
                }
                if(self.state.visible[k] !== visible[k]){
                    change = true;
                }
            });
            if(change){
                //Perf.start()
                this.setState({visible: visible})
                //Perf.stop()
                //var measurements = Perf.getLastMeasurements();
                //Perf.printInclusive(measurements)
                //Perf.printExclusive(measurements)
                //Perf.printDOM(measurements)
                //Perf.printWasted(measurements)
               // console.log(visible)
            }
           /*if(!_.isEqual(visible, this.state.visible)){
                this.setState({visible: visible}, function(){
                    var to_fetch = _.reject(_.keys(self.state.visible), function(k){
                        //return _.contains(self.props.requested_parts, k) || self.props.content.get(['parts', 'k']);
                    });
                    if(to_fetch.length){
                        //Actions.getMorePage(this.props.page, {requested_parts: to_fetch});
                    }
                });
            }*/
        }
    },
    shouldComponentUpdate: function(newProps, newState){
        return this.props.content !== newProps.content || this.state.visible !== newState.visible;
    },
    render: function(){
        console.log('article render')
        if(this.props.content.get('error')){
            return this.renderError()
        }
        else if(this.isPartial()){
            return this.renderSkeleton();
        }
        else{
            return this.renderStandard();
        }
    },
    renderError: function(){
        return <div className="article-error"><p className="text-danger">{this.props.content.error}</p></div>
    },
    renderStandard: function(){
        return <div dangerouslySetInnerHTML={{__html:this.props.content.get('html_content')}} />
    },
    renderSkeleton: function(){
        var self = this;
        var attrib_transform = {'@class': 'className', '@style': 'fauxstyle', '@tabindex': 'tabIndex', '@colspan': 'colSpan'};
        var id = 0;

        function to_components(v){
            var attributes = {}
            _.each(v, function(v, k){
                attributes['key'] = id++;
                if(attrib_transform[k]) attributes[attrib_transform[k]] = v
                else if(k[0] === '@') attributes[k.substring(1)] = v;
            });

            if(attributes['data-hook']){
                var hook = attributes['data-hook'];
                attributes['ref'] = hook;
                if(self.state.visible[hook]){
                    attributes['data-visible'] = true;
                    attributes['dangerouslySetInnerHTML'] = {__html: self.props.content.getIn(['parts', hook])};
                }
                else{
                    attributes.style = {height: self.heights[hook]};
                }
                //if(self.state.visible[hook]){
                //    attributes.style = {'backgroundColor': '#00ff00'}
                //}
                /*else if(self.state.visible[hook]){
                    attributes.className = (attributes.className || '') + ' csspinner traditional';
                    attributes.style = {height: self.heights[hook] || self.calculate_height(attributes['data-hook-length']|0, 1000)};
                }
                else{

                }*/

            }
            if(attributes['data-hook']){
                return React.DOM[v.tag](attributes);
            }
            return [React.DOM[v.tag](attributes, v['#text'], _.flatten(_.map(v.children, to_components))), v['#tail']];
        }

        return <div>
                {to_components(this.props.content.get('skeleton').toJS())}
            </div>
    },
    refresh: function(){
        var self = this;
        var pos = 'offset';
        this.locations = {
            offsets: [],
            targets: []
        };
        var offset = this.getScrollContainer().offset().top;
        this.scrollHeight = $(self.getDOMNode()).height();
        $(self.getDOMNode())
            .find('[data-location]')
            .map(function() {
                var $el = $(this);
                return ( $el.is(':visible') && [
                    [$el[pos]().top, this]
                ]) || null
            })
            .sort(function(a, b) {
                return a[0] - b[0]
            })
            .each(function(){
                    self.locations.offsets.push(this[0] - offset);
                    self.locations.targets.push(this[1]);
                });
        this.hooks = {
            offsets: [],
            targets: []
        };

    },
    popoverJumpTo: function(){
        Actions.articleJumpTo(this.props.page, {
            id: '#' + this.props.target
        });
    },
    onJumpTo: function(page, jump){
        if(page.get('id') !== this.props.page_id) return;
        var target;
        if(jump.location && jump.location.length){
            var node = $(this.getDOMNode());
            for(var i=0;i<jump.location.length;i++){
                node = node.find('[data-location^="'+jump.location[i]+'"]');
            }
            target = node;
        }
        else if(jump.id){
            target = $(this.getDOMNode()).find(jump.id);
        }
        if(target && target.length){
            var container = this.getScrollContainer();
            container.animate({scrollTop: container.scrollTop()+target.position().top + 4}, jump.noscroll ? 0: 300);
        }
        else{
            return 'Not Found';
        }
    },
    componentWillUnmount: function(){
        var $parent =  this.getScrollContainer();
        $parent.off('scroll', this.debounce_scroll);
        if(this.isPartial()){
            $parent.off('scroll', this.debounce_visibility);
            $(window).off('resize', this.reset_heights);
        }
    }
});

 var Popovers = React.createClass({
    shouldComponentUpdate: function(newProps){
        return (this.props.popoverView !== newProps.popoverView) || (this.props.popoverData !== newProps.popoverData)
    },
    render: function(){
        return <div>{ this.props.popoverView.map(function(key){
                var data = this.props.popoverData.get(key);
                return (<Popover.Popover placement="auto" viewer_id={this.props.viewer_id} {...data.toJS()} page_id={this.props.page_id} id={key} key={key} />)
            }, this).toJS()}</div>
    }
 });



var MobilePopovers = React.createClass({
    shouldComponentUpdate: function(newProps){
        return (this.props.popoverView !== newProps.popoverView) || (this.props.popoverData !== newProps.popoverData)
    },
    closeAll: function(){
        this.props.popoverView.map(function(key){
            Actions.popoverClosed(this.props.viewer_id, this.props.page_id, key);
        }, this),toJS();
    },
    render: function(){
        var last = this.props.popoverView.last();
        if(last !== undefined){
            var pop = this.props.popoverData.get(last);
            return <div className="mobile-popovers">
                    <Popover.MobilePopover {...pop.toJS()} page_id={this.props.page_id} closeAll={this.closeAll}/>
                </div>
        }
        return <div/>
    }
});


 module.exports = React.createClass({
    interceptLink: function(e){
        var link = $(e.target).closest('a:not([target])');

        if(link.length){
            e.preventDefault();
            if(link.attr('data-link-id')){
                var url = link.attr('data-href');
                if(url.indexOf('/') === -1){
                    url = 'instrument/'+url;
                }
                Actions.popoverOpened(this.props.viewer_id, this.props.page.get('id'),
                    {
                        type: 'link',
                        title: link.text(),
                        id: link.attr('data-link-id'),
                        target: link.attr('data-target-id'),
                        source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                        positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                        positionTop:link.position().top+ this.refs.articleContent.getScrollContainer().scrollTop(),
                        fetched: false,
                        url: '/link/'+url
                    });
                }
            else if(link.attr('data-def-id')){
               Actions.popoverOpened(this.props.viewer_id, this.props.page.get('id'),
                    {
                    type: 'definition',
                    title: link.text(),
                    id: link.attr('data-def-idx'),
                    positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                    positionTop:link.position().top + this.refs.articleContent.getScrollContainer().scrollTop(),
                    source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                    fetched: false,
                    url: '/definition/'+this.props.page.getIn(['content', 'document_id'])+'/'+link.attr('data-def-id')
                });
            }
            else if(link.closest('[id]').length){
                var target = link.closest('[id]');
                var title = this.props.page.title + ' ' + target.attr('data-location') ;
                var ids = target.find('id').map(function(){
                    return this.attributes.id;
                }).toArray();
                ids.push(target.attr('id'));
                Actions.sectionSummaryOpened(
                    this.props.viewer_id,
                    this.props.page.get('id'),
                    {id: target.attr('id'),
                    document_id: this.props.page.getIn(['content', 'document_id']),
                    title: this.props.page.get('title') +' '+ getLocationString(target),
                    govt_ids: ids
                });

            }
        }
    },
    componentDidMount: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
    },
    componentDidUpdate: function(){
       if(!this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
       }
       // if loading position popovers
       // TODO, minimize running this
       if(this.props.page.get('content')){
           var popovers = this.props.view.getIn(['popovers', this.props.page.get('id')]);
           if(popovers){
               popovers.forEach(function(p){
                    var pop = this.props.page.getIn(['popovers', p]);
                    if(pop && !pop.get('positionLeft') && !pop.get('positionTop')){
                        var link = $(pop.get('source_sel'), this.getDOMNode());
                        if(link.length){
                            Actions.popoverUpdate(this.props.viewer_id, this.props.page.get('id'), {
                                id: pop.get('id'),
                                positionLeft: link.position().left + this.refs.articleContent.getScrollContainer().scrollLeft(),
                                positionTop: link.position().top + this.refs.articleContent.getScrollContainer().scrollTop(),
                            });
                        }
                    }
               }, this);
            }
        }
    },
    warningsAndErrors: function(){
        if(this.props.page.getIn(['content', 'error'])){
            return <ArticleError error={this.props.page.getIn(['content', 'error'])}/>
        }
        else if(!this.props.page.getIn(['content', 'attributes', 'latest'])){
            return <NotLatestVersion />
        }
        return null;
    },
    render: function(){
        // perhaps swap popovers for different view on mobile
        if(!this.props.page.get('content')){
            return <div className="search-results"><div className="csspinner traditional" /></div>
        }
        return <div><div className="legislation-result" onClick={this.interceptLink} >
           { this.warningsAndErrors() }
            <ArticleOverlay page={this.props.page} viewer_id={this.props.viewer_id} />
          <ArticleContent ref="articleContent"
                content={this.props.page.get('content') }
                viewer_id={this.props.viewer_id}
                page_id={this.props.page.get('id')} />
             { this.props.view.getIn(['section_summaries', this.props.page.get('id')]) &&
                this.props.view.getIn(['section_summaries', this.props.page.get('id')]).size ?
                <SectionSummary
                sectionData={this.props.page.get('section_data')}
                sectionView={this.props.view.getIn(['section_summaries', this.props.page.get('id')])}
                viewer_id={this.props.viewer_id}
                page_id={this.props.page.get('id')} />
                : null }
            <MQ minWidth={480}>
                { this.props.view.getIn(['popovers', this.props.page.get('id')]) ?
                <Popovers
                    popoverData={this.props.page.get('popovers')}
                    popoverView={this.props.view.getIn(['popovers', this.props.page.get('id')])}
                    viewer_id={this.props.viewer_id}
                    page_id={this.props.page.get('id')} />
                : null }
            </MQ>
            <MQ maxWidth={480}>
                { this.props.view.getIn(['popovers', this.props.page.get('id')]) ?
                <MobilePopovers
                    popoverData={this.props.page.get('popovers')}
                    popoverView={this.props.view.getIn(['popovers', this.props.page.get('id')])}
                    viewer_id={this.props.viewer_id}
                    page_id={this.props.page.get('id')} />
                : null }
            </MQ>
        </div>

        </div>
    }
 });
