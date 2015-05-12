"use strict";
var React = require('react/addons');
var _ = require('lodash');
var $ = require('jquery');
var Actions = require('../actions/Actions');

module.exports =  {
    fetch: function(){
       if(this.props.page.get('query') && !this.props.page.get('fetching') && !this.props.page.get('fetched')){
            Actions.requestPage(this.props.page.get('id'));
        }
    },
    componentDidMount: function(){
         this.fetch();
    },
    componentDidUpdate: function(){
        this.fetch();
    },
    getScrollContainer: function(){
        return $(this.getDOMNode()).parents('.tab-content, .results-container')
    },
    shouldComponentUpdate: function(newProps){
        return this.props.page.get('content') !== newProps.page.get('content') || this.props.page.get('fetching') !== newProps.page.get('fetching');
    },
    isDefaultSortCol: function(key){
        return !this.props.page.getIn(['query', 'sort_col']) && key === '_score';
    },
    getSort: function(key){
        var dir = 'fa fa-chevron-'+(this.props.page.getIn(['query', 'sort_dir']) === 'asc' ? 'up': 'down');
        if( this.isDefaultSortCol(key) || this.props.page.getIn(['query', 'sort_col'])===key){
            return <span className={dir}/>
        }
    },
    toggleSort: function(key){
        var dir = 'desc';
        if(this.isDefaultSortCol(key) || this.props.page.getIn(['query', 'sort_col']) === key){
            dir = this.props.page.getIn(['query', 'sort_dir']) && this.props.page.getIn(['query', 'sort_dir']) === 'asc' ? 'desc' : 'asc'
        }
        var query = this.props.page.get('query').toJS();
        query['sort_dir'] = dir;
        query['sort_col'] = key;
        Actions.replacePage(this.props.page.get('id'), {
            query: query,
            title: this.props.page.get('title'),
            page_type: this.props.page.get('page_type')
            }, {skip_update: true}
            );
    },
    renderTableHead: function(){
        return <thead>
                <tr>
                    <th onClick={this.toggleSort.bind(this, '_score')}># {this.getSort('_score')}</th>
                    <th onClick={this.toggleSort.bind(this, 'title.simple')} className="title">Title {this.getSort('title.simple')}</th>
                    <th onClick={this.toggleSort.bind(this, 'type')}>Type {this.getSort('type')}</th>
                    <th onClick={this.toggleSort.bind(this, 'year')}>Year {this.getSort('year')}</th>
                </tr>
            </thead>
    },
    renderTable: function(){
        var total = this.props.page.getIn(['content', 'search_results', 'total']);
        if(!this.props.page.getIn(['content', 'search_results']) && this.props.page.get('fetching')){
            return <div className="search-results"><div className="csspinner" /></div>
        }
        else if(!total){
            return <div className="search-results">
                <div className="search-count">No Results Found</div>
                </div>
        }
        else if(this.props.page.getIn(['content', 'search_results'])){
            var total_str = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return <div className="search-results">
                <div className="search-count">{total} Results Found</div>
                <table className="table table-striped table-hover">
                    { this.renderTableHead() }
                    <tbody>
                    { this.props.page.getIn(['content', 'search_results', 'hits']).map(function(r, i){
                            return this.renderRow(r, i)
                        }, this).toJS()
                    }
                    </tbody>
                    </table>
                    {this.props.page.get('fetching') ?  <div className="csspinner" /> : null }
                </div>
        }
        else{
            return <div className="search-results"><div className="article-error"><p className="text-danger">{this.props.page.getIn(['content', 'error'])}</p></div></div>
        }
    }
};