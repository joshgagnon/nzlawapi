var React = require('react');
var Actions = require('../Actions/actions');

module.exports = React.createClass({
    base_url: 'http://www.legislation.govt.nz/subscribe/',
    toggleAdvanced: function(){
        if(this.props.page && this.props.page.get('page_type') === 'search'){
            Actions.toggleAdvanced( this.props.viewer_id, this.props.page.get('id'));
        }
        else{
             Actions.newAdvancedPage(
                {title: 'Advanced Search',
                page_type: 'search'
            }, this.props.viewer_id)
        }
    },

    handlePrint: function(){

        return  <a target="_blank" href={this.base_url + url} className="btn btn-info">PDF</a>
    },
    linkPDF: function(){
        if(this.props.page && this.props.page.getIn(['content','attributes', 'path'])){
            var url = this.props.page.getIn(['content','attributes', 'path']).replace('.xml', '.pdf');
            return <li className="suboption">
                        <a target="_blank" href={this.base_url + url}  ><span className="fa fa-file-pdf-o" title="Download PDF"/><span className="sublabel">Download PDF</span>
                </a></li>
        }
    },
    renderPrint: function(){
        return <li><div className="button">
                <a ><span className="fa fa-print"  title="Print"/></a>
                </div>
                <ul className="children">
                    <li className="title"><span>Print Options</span></li>
                    { this.linkPDF() }
                    <li className="suboption">
                    <a onClick={Actions.togglePrintMode}>
                        <span className="fa fa-columns" title="Print Mode"/>
                        <span className="sublabel">Toggle Print Column</span>
                    </a></li>
                </ul>
            </li>
    },


    render: function(){
        return <div className="buttonbar-wrapper">
            <ul>
            <li onClick={this.toggleAdvanced}><div className="button"><a ><span className="fa fa-search-plus" title="Advanced Search"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Advanced Search</a></li>
                </ul>
            </li>
            <li><div className="button">
                <a><span className="fa fa-wrench" title="View Settings" ></span></a>
                </div>
                <ul className="children">
                <li className="title"><span>View Settings</span></li>
                <li className="suboption">
                    <a onClick={Actions.toggleUnderlines} >
                        <span className="fa fa-underline" title="Underlines"/>
                        <span className="sublabel">Toggle Underlines</span>
                    </a>
                </li>
                <li className="suboption">
                    <a onClick={Actions.toggleSplitMode}>
                        <span className="fa fa-columns"  title="Columns"/>
                        <span className="sublabel">Toggle Columns</span>
                    </a></li>
                </ul>
            </li>

            { this.renderPrint() }

            <li onClick={Actions.openLoadDialog}><div className="button"><a><span className="fa fa-folder-open" title="Open Saved Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Open Saved Session</a></li>
                </ul>
            </li>

            <li onClick={Actions.openSaveDialog}><div className="button"><a><span className="fa fa-floppy-o" title="Save Saved Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Save Session</a></li>
                </ul>
            </li>

             <li onClick={Actions.reset}><div className="button"><a><span className="fa fa-close" title="Reset Session"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Reset Session</a></li>
                </ul>
            </li>

            </ul>
        </div>
    }
});

//pdf-o download pdf

//underline