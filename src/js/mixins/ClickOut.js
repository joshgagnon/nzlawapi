var React = require('react/addons');
var EventListener = require('react-bootstrap/lib/utils/EventListener');


module.exports = {
    handleDocumentClick: function(e) {
        // If the click originated from within this component
        // don't do anything.
        if (!React.findDOMNode(this.clickOutComponent()).contains(e.target)) {
            this.handleClickOut();
        }
    },
    bindRootCloseHandlers: function() {
        if(!this._onDocumentClickListener){
            this._onDocumentClickListener =
                EventListener.listen(document, 'click', this.handleDocumentClick);
        }
    },
    unbindRootCloseHandlers: function() {
        if (this._onDocumentClickListener) {
            this._onDocumentClickListener.remove();
            this._onDocumentClickListener = null;
        }
    },
    componentDidUpdate: function(){
        if(!this.bindClickOut() && this._onDocumentClickListener){
            this.unbindRootCloseHandlers();
        }
        else if(this.bindClickOut() && !this._onDocumentClickListener){
            this.bindRootCloseHandlers();
        }
    }
}