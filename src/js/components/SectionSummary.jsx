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
     componentDidUpdate: function(){
        if(this.props.sectionView.last()){
            Actions.requestSectionReferences(this.props.page_id, this.props.sectionView.last());
        }
    },
    getLast: function(){
        return this.props.sectionData.get(this.props.sectionView.last());
    },
    renderBody: function(data){
        if(data.get('section_references') && data.get('section_references').size){
            var data = this.getLast();
            var doc_id = data.get('document_id')
            var external = data.get('section_references').filter(function(ref){
                return ref.get('source_document_id') !== doc_id;
            });
            var internal= data.get('section_references').filter(function(ref){

                return ref.get('source_document_id') === doc_id;
            });
            return <div>
                <span>This section has been externally referenced by </span>
                <ul>
                    {external.map(function(ref, i){
                        return <li key={i} onClick={this.openLink.bind(this, '/'+ref.get('url'), ref.get('repr'))}><a href={'/open_article/'+ref.get('url')}>{ref.get('repr')}</a></li>
                    }, this)}
                </ul>
                <span>This section has been referenced internally by </span>
                <ul>
                    {internal.map(function(ref, i){
                        return <li key={i} onClick={this.openLink.bind(this, '/'+ref.get('url'), ref.get('repr'))}><a href={'/open_article/'+ref.get('url')}>{ref.get('repr')}</a></li>
                    }, this)}
                </ul>
                </div>
        }else if(data.get('fetching')){
            return <div className="csspinner traditional"/>
        }
        else{
            return <div>There are no known references</div>
        }
    },
    close: function() {
         Actions.sectionSummaryClosed(this.props.viewer_id, this.props.page_id, this.props.sectionView.last());
    },
    openLink: function(query, title, e){
        e.preventDefault();
        Actions.newPage({
            title: title,
            query_string: query
        }, this.props.viewer_id);
        this.close();
    },
    focusSection: function(){
        Actions.newPage({
            title: this.getLast().get('title'),
            query:{
                id: this.props.sectionView.last(),
                doc_type: 'instrument',
                find: 'location'
            }
        }, this.props.viewer_id);
         this.close();
    },
    addToPrint: function(){
        Actions.addToPrint({
            title: this.getLast().get('title'),
            query:{
                id: this.props.sectionView.last(),
                doc_type: 'instrument',
                find: 'location'
            }
        });
        this.close();
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
                            <Button bsStyle={'info'} onClick={this.addToPrint}>Add To Print</Button>
                        </div>
                    </Modal>
                  </div>
            }
        return <div/>
    }
})
