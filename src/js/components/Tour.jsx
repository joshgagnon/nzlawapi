"use strict";
var React = require('react/addons');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');
var Reflux = require('reflux');
var Immutable = require('immutable');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var constants = require('../constants');


var tour_data = [
    {
        'title': 'Welcome',
        'text': 'Welcome to Catalex Law Browser.  Type in here to search our database.',
        'selector': '.main-search',
        'position': 'bottom',
        'offset': {top:40},
        'action': function(){
            Actions.setSearchForm({
                article_type: 'act',
                search_query: 'Financial Markets Conduct Act 2013',
                document_id: 'DLM4090503',
                find: 'govt_id',
                show_location: true
            });
        }
    },
    {
        'title': 'Locations',
        'text': 'Because this document has an exact match, we can jump to or focus on a particular section or range.  Hit next to see an example.',
        'selector': '.locations .focus',
        'position': 'bottom',
        'offset': {top:40},
        'action': function(){
            Actions.setSearchForm({
                focus: 's 108-109',
                show_location: true
            });

            Actions.newPage({
                query: {doc_type: 'act',
                find: 'location',
                location: 's 108-109',
                document_id:  'DLM4090503'},
                title: 'Financial Markets Conduct Act 2013',
                page_type: constants.PAGE_TYPES.INSTRUMENT
            }, 'tab-0');
        }
    },
    {
        'title': 'Definitions',
        'text': 'Clicking on a green underlined word will give you a contextual definition.',
        'selector': '.def-popover:contains("supervisor")',
        'position': 'bottom',
        'offset': {left: -200, top:30},
        'action': function(link){
            var event = new MouseEvent('click', {
                 'view': window,
                 'bubbles': true,
                 'cancelable': true,
                 'target': link[0]
                });
            link[0].dispatchEvent(event);
        }
    },
    {
        'title': 'Context Menu',
        'text': "Clicking on section, clause, subsection etc title or number will display a context menu. ",
        'selector': '.focus-link',
        'position': 'right',
        'offset': {left: 100, top:-50},
        'action': function(link){
            console.log(link.offset().top, link.offset().left);
            var e = new MouseEvent('click', {
                 'view': window,
                 'bubbles': true,
                 'cancelable': true,
                 'target': link[0],
                });
            link[0].dispatchEvent(e);
        }
    },
    {
        'title': 'Add to Print',
        'text': "Clicking add to print will add this section to the current print document",
        'selector': '.context-menu .add-to-print',
        'position': 'right',
        'offset': {left: 180, top:-50},
        'action': function(link){
            Actions.addToPrint({
                title: 'Financial Markets Conduct Act 2013 s 108',
                query:  {document_id: 'DLM4090503',
                        location: 's 108',
                        doc_type: 'instrument',
                        find: 'location'}
            });
            Actions.contextMenuClosed();
        }
    },
    {
        'title': 'View Print Document',
        'text': "Use the button bar on the left hand side to open your print document",
        'selector': '.print-button .toggle-print',
        'position': 'right',
        'offset': {left: 200, top:-50},
        'preaction': function(){
            $('.buttonbar-wrapper .print-button').addClass('activated');
            $('.buttonbar-wrapper .print-button .toggle-print').addClass('activated');
        },
        cleanup: function(){
            $('.buttonbar-wrapper .print-button').removeClass('activated');
            $('.buttonbar-wrapper .print-button .toggle-print').removeClass('activated');
        },
        'action': function(link){
            Actions.togglePrintMode();
        }
    },
     {
        'title': 'Your Print Document',
        'text': "Here you can rearrange and remove pieces of your compiled print document.  \n You can also share a link to a publicly accessible version of this document.",
    },
    {
        'title': 'Many More Features',
        'text': 'There are many more features currently implemented and even more to come.  Now click finish to return to your previous session.',
        //'offset': {left: -250},
    }
]




var TourRecord = Immutable.Record({
                running: false,
                position: 0,
                data: tour_data
        });

// only current used for reset
var TourStore = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.tour = this.getInitialState().tour
    },
    getDefaultData: function(){
        return new TourRecord();
    },
    getInitialState: function(){
        return {
            tour: this.getDefaultData()
        };
    },
    onTourStart: function(state){
        Actions.pushState();
        Actions.reset();
        Actions.activateUnderlines();
        this.tour = this.tour.set('running', true).set('position', 0);
        this.trigger({'tour': this.tour});
    },
    onTourStop: function(state){
        this.tour = this.tour.set('running', false);
        this.trigger({'tour': this.tour});
        Actions.popState();
        Actions.setSearchForm({
            article_type: null,
            search_query: '',
            document_id: null,
            find: null,
            show_location: false
        });
        Actions.userAction();


    },
    onTourNext: function(){
        var pos = this.tour.get('position');
        if(pos < this.tour.get('data').length-1){
           this.tour = this.tour.set('position',  pos +1);
            this.trigger({'tour': this.tour});
        }
        else{
            Actions.tourStop();
        }

    }
});

var TourEntry = React.createClass({
    mixins: [
        PureRenderMixin
    ],
    getInitialState: function(){
        return {style: Immutable.Map()}
    },
    findTarget: function(){
        if(this.isMounted()){

            if(this.props.data.selector){
                var self = this;
                var $el = $(this.props.data.selector);
                if($el.length){
                    if(this.props.data.preaction){
                        this.props.data.preaction();
                    }
                    this.setState({style: this.state.style.merge($el.offset())});
                }
                else{
                    setTimeout(function(){
                        self.findTarget();
                    }, 100)
                }
            }
            else{
                 if(this.props.data.preaction){
                    this.props.data.preaction();
                }
                 this.setState({style: this.state.style.merge({top:200, left: '30%'})});
            }
        }
    },
    componentWillUnmount: function(){
        if(this.props.data.cleanup){
            this.props.data.cleanup();
        }
    },
    componentWillReceiveProps: function(newProps){
        if(this.props.data.cleanup && newProps.data !== this.props.data){
            this.props.data.cleanup();
        }
    },
    componentDidMount: function(){
        this.findTarget();
    },
    componentDidUpdate: function(){
        this.findTarget();
    },
    next: function(){
        if(this.props.data.action){
            this.props.data.action($(this.props.data.selector).first());
        }
        Actions.tourNext();
    },
    render: function(){
        var style = this.state.style.toJS();
        if(style.top !== undefined){
            if(this.props.data.offset){
                style.top += this.props.data.offset.top ? this.props.data.offset.top  : 0;
                style.left += this.props.data.offset.left ? this.props.data.offset.left  : 0;
            }
            style.display = "block";
        }
        var classes = 'popover cata-popover tour ' + this.props.data.position;
        var arrowStyle = {};
        return <div className={classes} style={style} >
            <div className="arrow"  style={arrowStyle} />
                <h3 className="popover-title">{this.props.data.title}</h3>
                <div className="popover-close" onClick={Actions.tourStop}>&times;</div>
                <div className='popover-content'>
                <div>{this.props.data.text}</div>
                </div>
            <div className="popover-footer">
                    <div className="row">
                        <button className="btn btn-primary" onClick={this.next}>{this.props.last ? 'Finish Tour' : 'Next'}</button >
                    </div>
                </div>
            </div>
    }
});



var Tour = React.createClass({
    mixins: [
        Reflux.listenTo(TourStore, 'setState')
        ],
    getInitialState: function(){
        return {tour: TourStore.getDefaultData()}
    },
    render: function(){
        if(this.state.tour.get('running')){
            return <TourEntry data={this.state.tour.get('data')[this.state.tour.get('position')]}
            last={this.state.tour.get('position') === this.state.tour.get('data').length-1}/>
        }
        return <div/>
    }
});

module.exports = Tour;
