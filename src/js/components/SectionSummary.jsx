"use strict"
var React = require('react/addons');
var Button = require('react-bootstrap/lib/Button');
var Reflux = require('reflux');
var Input = require('react-bootstrap/lib/Input');
var Modal = require('react-bootstrap/lib/Modal');
var Actions = require('../actions/Actions.js');
var _= require('lodash');

module.exports = React.createClass({
    componentDidMount: function(){
        if(this.props.sectionView.last()){
            Actions.requestSectionReferences(this.props.page_id, this.props.sectionView.last());
        }
    },
    getLast: function(){
        return this.props.sectionData.get(this.props.sectionView.last());
    },
    renderBody: function(data){
        if(data.get('section_references')){
            return data.get('section_references').map(function(ref, i){
                return <li key={i}><a href={'/open_article/'+ref.get('url')}>{ref.get('repr')}</a></li>
            }).toJS()
        }else{
            return <div className="csspinner traditional"/>
        }
    },
    close: function() {
         Actions.sectionSummaryClosed(this.props.viewer_id, this.props.page_id, this.props.sectionView.last());
    },
    render: function(){
        var last = this.props.sectionView.last();
        var data = last && this.getLast();
        if(data){
                return <div className="static-modal section-summary">
                          <Modal title={data.get('title')} onRequestHide={this.close}>
                            <div className="modal-body">
                                {this.renderBody(data)}
                            </div>
                            <div className="modal-footer">
                                <Button bsStyle={'info'} onClick={this.open}>Focus In New Tab</Button>
                                <Button bsStyle={'info'} onClick={this.open}>Add To Print</Button>
                            </div>
                        </Modal>
                      </div>
        }
        return <div/>
    }
})
