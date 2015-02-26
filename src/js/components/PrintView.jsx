var _ = require('lodash');
var $ = require('jquery');
var React = require('react/addons');
var Actions = require('../actions/Actions');


module.exports = React.createClass({
    shouldComponentUpdate: function(newProps, newState){
        return (this.props.view !== newProps.view) || (this.props.print !== newProps.print);
    },
    getPrint: function(k){
        return this.props.print.find(function(p){
            return p.get('id') === k;
        });
    },
    renderPrint: function(k, i){
        var print = this.getPrint(k);
        if(print && print.get('html')){
            return <div key={i} className="print-section">
                        <div dangerouslySetInnerHTML={{__html: print.get('html')}}/>
                        </div>
        }
        else{
            return <div key={i} className="csspinner traditional"></div>
        }
    },
    componentDidMount: function(){
        this.fetch();
    },
    componentDidUpdate: function(){
        this.fetch();
    },
    fetch: function(){
        this.props.print.map(function(p){
            if(!p.get('fetched')){
                Actions.fetchPrint(p.get('id'));
            }
        });
    },
    render: function(){
        return  <div className="print-container legislation-result">
            <div className="alert alert-info" role="alert">Add sections and definitions here to create a custom document</div>
                { this.props.view.map(function(k, i){
                    return this.renderPrint(k, i);
                }, this).toJS()}
            </div>
    }

});