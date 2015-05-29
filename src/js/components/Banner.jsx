var React = require('react/addons');
var MQ = require('./Responsive.jsx');


module.exports = React.createClass({
    render: function(){
      var classes = 'navbar navbar-default navbar-fixed-top';
      if(this.props.extraClasses){
        classes += this.props.extraClasses;
      }
        return <div className="container-fluid">
                 <nav className={classes}>
                  <img className="chev-left hidden-xs" src="/build/images/left-chevron.png"/><img className="chev-right hidden-sm" src="/build/images/right-chevron.png"/>
                    <div className="brand-wrap">
                         <img src="/build/images/law-browser.png" alt="CataLex" className="logo img-responsive center-block hidden-xs"/>
                         <MQ maxWidth={768}>
                            <div className="logo-sml-button visible-xs-block">
                                <img src="/build/images/law-browser-sml.png" alt="CataLex" className="logo-sml img-responsive center-block "/>
                                { this.props.renderDropdown ? this.props.renderDropdown() : null}
                            </div>
                        </MQ>
                    </div>
                    { this.props.children }
                </nav>
        </div>
    }
})