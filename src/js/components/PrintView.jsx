var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');


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
                        <div ref={'body'} dangerouslySetInnerHTML={{__html: this.props.seg.get('html')}}/>
                    </div>
        }
        else{
            return <div className="csspinner traditional"></div>
        }
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
            <span className="print-title">{this.props.seg.get('title')}</span>
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
            //el.style.display = "initial";
            el.style.backgroundColor = "";
        });
    },
    mangleChildren: function(){
        var prev;
        this._to_hide = []
        for(var i=0; i<this.props.view.size; i++){
            if(this.refs[i].refs.body){
                if(prev){
                    this._to_hide = this._to_hide.concat(this.hideRepeats(prev, this.refs[i].refs.body.getDOMNode()));
                }
                prev = this.refs[i].refs.body.getDOMNode();
            }
            else{
                prev = null;
            }
        }
        console.log(this._to_hide)
        _.map(this._to_hide ||[], function(el){
            //el.style.display = "none";
            el.style.backgroundColor = "#33ff33";
        });
    },
    hideRepeats: function(first, second){

        function compare(first, second){
            if(first.outerHTML === second.outerHTML){
                return second;
            }
            return _.filter(_.flatten(_.map(first.children, function(c, i){
                if(second.children[i]){
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
        return <div onClick={this.handleClick}>{this.props.view.map(function(k, i){
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
    shouldComponentUpdate: function(newProps, newState){
        return (this.props.view !== newProps.view) || (this.props.print !== newProps.print);
    },

    render: function(){
        return  <div className="print-container legislation-result">
            <div className="alert alert-info" role="alert">Add sections and definitions here to create a custom document</div>
                <PrintOverview {...this.props} />
                <PrintFull{...this.props} />
            </div>
    }

});