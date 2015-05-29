var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;


/*

if(window.print !== ‘undefined’) { return <a className=“btn” onClick={window.print}>Print</a> }

*/


var PrintHandler = {
    printOverLay: function(){
        return <div className="btn-group">
            <a onClick={this.moveUp}><span className="fa fa-chevron-up" title="Move Up"/></a>
            <a onClick={this.moveDown}><span className="fa fa-chevron-down"  title="Move Down"/></a>
            <a onClick={this.close}><span className="fa fa-close"  title="Remove"/></a>
        </div>
    },
    moveUp: function(){
        Actions.printMovePosition(this.props.seg.get('id'), this.props.index-1);
    },
    moveDown: function(){
        Actions.printMovePosition(this.props.seg.get('id'), this.props.index+1);
    },
    close: function(){
        Actions.removeFromPrint(this.props.seg.get('id'))
    }
}

var PrintSegment = React.createClass({
    mixins: [
        PrintHandler
    ],
    render: function(k){
        if(this.props.seg && this.props.seg.get('html')){
            return <div className="print-section">
                        { this.printOverLay() }
                        {/* this.printTitle() */}
                        <div ref={'body'} dangerouslySetInnerHTML={{__html: this.props.seg.get('html')}}/>
                    </div>
        }
        else if (this.props.seg && this.props.seg.get('error')){
            return <div className="alert alert-danger">An error occured while trying to fetch result</div>
        }
        return <div className="csspinner traditional"></div>

    },
    componentDidMount: function(){
        this.fetch();
    },
    componentDidUpdate:function(){
        this.fetch();
    },

    fetch: function(){
        if(this.props.seg && !this.props.seg.get('fetched')){
            Actions.fetchPrint(this.props.seg.get('id'));
        }
    },
});


var PrintSummary= React.createClass({
    mixins: [
        PrintHandler
    ],
    render: function(k){
        return <li className="print-summary panel panel-default">
            <span className="print-title">{this.props.seg.get('full_title') || this.props.seg.get('title')}</span>
            <span className="buttons">{ this.printOverLay() }</span>
        </li>
    },
});


var GetPrint = {
    getPrint: function(k){
        return this.props.print.find(function(p){
            return p.get('id') === k;
        });
    }
}

var PrintFull = React.createClass({
    mixins: [GetPrint],
    componentWillUpdate: function(){
     _.map(this._to_hide ||[], function(el){
            el.style.display = "";
        });
    },
    mangleChildren: function(){
        var prev;
        this._to_hide = []
        for(var i=0; i<this.props.view.size; i++){
            if(this.refs[i].refs.body){
                if(prev){
                    this._to_hide = this._to_hide.concat(this.hideRepeats(prev, React.findDOMNode(this.refs[i].refs.body)));
                }
                prev = React.findDOMNode(this.refs[i].refs.body);
            }
            else{
                prev = null;
            }
        }
        _.map(this._to_hide ||[], function(el){
            el.style.display = "none";
        });
    },
    hideRepeats: function(first, second){
        var end = false;
        function compare(first, second){
            if(!first.children.length && first.outerHTML !== second.outerHTML){
                end = true;
                return [];
            }
            if(first.outerHTML === second.outerHTML){
                return [second];
            }
            return _.filter(_.flatten(_.map(first.children, function(c, i){
                if(!end && second.children[i]){
                    return compare(first.children[i], second.children[i])
                }
            })));
        }

        return compare(first, second);
    },
    componentDidMount: function(){
        this.mangleChildren();
    },
    componentDidUpdate: function(){
        this.mangleChildren();
    },
    handleClick: function(e){
        e.preventDefault();
    },
    render: function(){
        return <div className="print-sections" onClick={this.handleClick}>{this.props.view.map(function(k, i){
            return <PrintSegment seg={this.getPrint(k)} key={i} index={i} ref={i}/>
        }, this).toJS()}</div>
    }
});


var PrintOverview = React.createClass({
    mixins: [GetPrint],
    render: function(k){
       return <div className="print-summaries">
            <ul>{this.props.view.map(function(k, i){
                return <PrintSummary seg={this.getPrint(k)} key={i} index={i} ref={i}/>
            }, this).toJS()}</ul>
        </div>
    },
});


module.exports = React.createClass({
    propTypes: {
        view: React.PropTypes.object.isRequired
    },
    mixins: [PureRenderMixin],
    handlePublish: function(){
        var html = this.props.view.map(function(k, i){
            return React.findDOMNode(this.refs.full.refs[i].refs.body).innerHTML;
        }, this).toJS().join('');
        Actions.publishPrint(html);
    },
    render: function(){
        var print_button = window && window.print && this.props.view.size;
        return  <div className="print-container legislation-result">
                { this.props.showOpenColumns ?
                    <div className="controls left">
                    <div className="btn-group">
                        <button onClick={Actions.toggleSplitMode} className="btn btn btn-info">Current Session</button>
                        </div></div> : null
                }
                { !this.props.view.size ?
                    <div className="message">
                        <div className="alert alert-info" role="alert">Add sections and definitions here to create a custom document</div>
                    </div> : <div className="push-down"/>

                }

                    <div className="controls  right">
                        <div className="btn-group">
                            <button onClick={window.print} className="btn btn btn-info">Print</button>

                            <button onClick={this.handlePublish} className="btn btn btn-info">Share</button>

                            <button onClick={Actions.closeView.bind(null, 'print')} className="btn btn btn-info">Close</button>
                        </div>
                    </div>

                <PrintOverview {...this.props} />
                <PrintFull {...this.props} ref="full"/>
            </div>
    }

});