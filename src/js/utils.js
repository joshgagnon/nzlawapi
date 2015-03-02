var $ = require('jquery');

module.exports = {
    //http://www.seabreezecomputers.com/tips/find.htm
    formatGovtDate: function(govt_date_string){
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        matches = (govt_date_string||'').match(/(\d+)-(\d+)-(\d+)/);
        if(matches){
            return matches[3] + ' ' + months[(matches[2]|0)-1] +' '+ matches[1];
        }
        return govt_date_string;
    },

    stopScrollPropagation: function(e){
        e.stopPropagation();
        var elem = $(this.getDOMNode()).find(this.scrollable_selector);
        if(e.deltaY < 0 && elem.scrollTop() == 0) {
                e.preventDefault();
           }
        if(e.deltaY > 0 && elem[0].scrollHeight - elem.scrollTop() == elem.outerHeight()) {
                e.preventDefault();
        }
    }

}