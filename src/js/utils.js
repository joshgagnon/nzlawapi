var $ = require('jquery');
var _ = require('lodash');


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
        if(e.deltaY > 0 && elem[0].scrollHeight - elem.scrollTop() <= elem.outerHeight()) {
            e.preventDefault();
        }
    },

    splitLocation: function(loc){
        var m = _.filter(loc.split(/[,()]/)).map(function(s){
                s = s.trim();
                if(s.indexOf('cl') === 0){
                    s = ', '+s;
                }
                else if(s.indexOf(' ') === -1 && s.indexOf('[') === -1){
                    s = '('+s+')';
                }
                return s;
            });
        return m;
    },
    queryUrl: function(query){
        return '/open_article/query?' + $.param(query);
    },
    queryUrlJSON: function(query){
        return '/query?' + $.param(query);
    },
    getLocation: function($el){
        var breadcrumb=[], locs=[];
        function traverse($el){
            $el.parents('[data-location]:not([data-link-id]):not([data-hook])').addBack().map(function(){
                var $this = $(this);
                breadcrumb.push($this.attr('data-location-breadcrumb') || $this.attr('data-location'));
                if(!$this.is('[data-location-no-path]')){
                    locs.push($this.attr('data-location'));
                }
            })
        }
        traverse($el);
        if(!locs.length){
            breadcrumb = [];
            traverse($el.parent('[id]').find('[data-location]:not([data-link-id]):not([data-hook])').first())
        }
        breadcrumb = _.filter(breadcrumb);
        locs = _.filter(locs);
        var filtered_locs = [];
        var is_sub = function(loc1, loc2){
            //loc2 must have '.',
            return loc2.indexOf('.') > -1 && loc2.replace(/[()]/g, '').indexOf(loc1.replace(/[()]/g, '')) > -1;
        }
        // no filter now locs that are consecutive rules, identified by having a '.'
        for(var i=0;i < locs.length -1; i++){
            if(!is_sub(locs[i], locs[i+1])){
                filtered_locs.push(locs[i]);
            }
        }
        filtered_locs.push(locs[locs.length-1]);
        return {repr: filtered_locs.join(''), locs: breadcrumb};
    },
    locationsToSelector: function(locs){
        return _.map(locs, function(loc){
            return '[data-location="'+loc+'"]'
        }).join(' ');

    },
    rangeDistance: function(x, y){
        var result = 0;
        var inv = 1;
        if(x[0] > y[0]){
            var tmp = y;
            y = x;
            x = tmp;
            inv = -1;
         }
         if(x[1] < y[0]){ result = y[0] - x[1]; }
         return result * inv;
    }

}