var React = require('react');
var Actions = require('../actions/Actions');
var constants = require('../constants');


module.exports = React.createClass({
    base_url: 'http://www.legislation.govt.nz/subscribe/',
    toggleAdvanced: function(){
        var active = this.props.page;
        if(active && active.get('page_type') === constants.PAGE_TYPES.SEARCH){
            if(active.get('content')){
                Actions.toggleAdvanced('tab-0', active.get('id'));
            }
            else{
                Actions.removePage(active.get('id'));
            }
        }
        else{
             Actions.newAdvancedPage(
                {title: 'Advanced Search',
                page_type: constants.PAGE_TYPES.SEARCH
            }, this.props.viewer_id)
        }
    },
    handleAddToPrint: function(){
        Actions.addToPrint({
            title: this.props.page.getIn(['content','full_title']) || this.props.page.getIn(['content','title']),
            query: this.props.page.getIn(['content', 'query']),
            html: this.props.page.getIn(['content','html_content'])
        });
    },
    linkPDF: function(){
        if(this.props.page && this.props.page.getIn(['content','attributes', 'path'])){
            var url = this.props.page.getIn(['content','attributes', 'path']).replace('.xml', '.pdf');
            return <li className="suboption">
                        <a target="_blank" href={this.base_url + url}  ><span className="fa fa-file-pdf-o" title="Full PDF"/><span className="sublabel">Full PDF</span>
                </a></li>
        }
    },
    addToPrint: function(){
        if(this.props.page && this.props.page.getIn(['content','format']) === 'fragment'){
            return <li className="suboption">
                        <a onClick={this.handleAddToPrint} ><span className="fa fa-copy" title="Full PDF"/><span className="sublabel">Add To Print</span>
                </a></li>
        }
    },
    renderPrint: function(){
        return <li><div className="button">
            <a><span className="fa fa-print" title="Print"/></a>
            </div>
            <ul className="children">
                <li className="title"><span>Print Options</span></li>
                { this.linkPDF() }
                { this.addToPrint() }
                <li className="suboption">
                <a onClick={Actions.togglePrintMode}>
                    <span className="fa fa-file-text-o" title="Your Print Document"/>
                    <span className="sublabel">Your Print Document</span>
                </a></li>
            </ul>
        </li>
    },
    renderPageControls: function(){
        if(this.props.page_dialog){
            return <li onClick={Actions.openPageDialog}><div className="button">
                <a><span className="fa fa-info-circle" title="Locations & Info"/></a>
                </div>
                <ul className="children">
                     <li className="title"><a>Locations & Info</a></li>
                </ul>
            </li>
        }
    },
    renderUserControls: function(){
        if(this.props.user_controls){
            return <li><div className="button">
                <a><span className="fa fa-user" title="Account" ></span></a>
                </div>
                <ul className="children">
                <li className="title"><span>Account</span></li>
                <li className="suboption">
                    <a  href="https://users.catalex.nz">
                        <span className="fa fa-cog" title="Account Page"/>
                        <span className="sublabel">Account Page</span>
                    </a>
                </li>
                <li className="suboption">
                    <a href="/logout">
                        <span className="fa fa-sign-out"  title="Columns"/>
                        <span className="sublabel">Logout</span>
                    </a></li>
                </ul>
            </li>
        }
    },
    renderViewSettings: function(){
       return <li><div className="button">
            <a><span className="fa fa-wrench" title="View Settings" ></span></a>
            </div>
            <ul className="children">
            <li className="title"><span>View Settings</span></li>
            <li className="suboption">
                <a onClick={Actions.toggleUnderlines} >
                    <span className="fa fa-underline" title="Underlines"/>
                    <span className="sublabel">Underlines</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={Actions.toggleNotes} >
                    <span className="fa fa-file-text-o" title="Notes"/>
                    <span className="sublabel">Notes</span>
                </a>
            </li>
            <li className="suboption">
                <a onClick={Actions.toggleSplitMode}>
                    <span className="fa fa-columns"  title="Columns"/>
                    <span className="sublabel">Columns</span>
                </a>
            </li>
            { this.props.sidebar ? <li className="suboption">
                <a onClick={Actions.toggleSidebar}>
                    <span className="fa fa-list-ul"  title="Side Bar"/>
                    <span className="sublabel">Side Bar</span>
                </a>
            </li> : null }

            </ul>
        </li>
    },
    render: function(){
        return <div className="buttonbar-wrapper">
            <ul>
            { this.renderPageControls() }
            { this.renderUserControls() }


            <li onClick={this.toggleAdvanced}><div className="button"><a ><span className="fa fa-search-plus" title="Advanced Search"/></a>
                </div>
                 <ul className="children">
                    <li className="title"><a>Advanced Search</a></li>
                </ul>
            </li>

            { this.renderViewSettings() }
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
