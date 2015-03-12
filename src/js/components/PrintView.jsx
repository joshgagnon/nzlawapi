var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');
var Glyphicon= require('react-bootstrap/lib/Glyphicon');


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
            console.log(this.props.seg.toJS())
            return <div className="print-section">
                        { this.printOverLay() }
                        <div dangerouslySetInnerHTML={{__html: this.props.seg.get('html')}}/>
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
    render: function(){
        return <div>{this.props.view.map(function(k, i){
            return <PrintSegment seg={this.getPrint(k)} key={i} index={i}/>
        }, this).toJS()}</div>
    }
});


var PrintOverview = React.createClass({
    mixins: [GetPrint],
    render: function(k){
       return <div className="print-summaries">
        <ul>{this.props.view.map(function(k, i){
            return <PrintSummary seg={this.getPrint(k)} key={i} index={i}/>
        }, this).toJS()}</ul></div>
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