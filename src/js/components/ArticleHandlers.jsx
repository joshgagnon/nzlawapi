var Actions = require('../actions/Actions');
var Utils = require('../utils');
var $ = require('jquery');
var _ = require('lodash');
var POPOVER_TYPES = require('../constants').POPOVER_TYPES;

// must implement getDocumentId, overlayOffset and getTitle to get all handlers

 module.exports =
    {
        interceptLink: function(e){
            var link = $(e.target).closest('a:not([target])');
            var page_id = this.props.page ? this.props.page.get('id') : this.props.page_id;
            var popover_offset = 250;
            if(this.getDocumentId && $(e.target).closest('.focus-link').length &&  !$(e.target).is('[quote]')){
                e.preventDefault();
                e.stopPropagation();
                var $target = $(e.target).closest('[id]');
                var location = Utils.getLocation($(e.target));
                var govt_ids = [];
                if(link.parent().parent().attr('id')){
                    govt_ids = [link.parent().parent().attr('id')];
                }
                var target_path = location.repr;
                var selector = _.map(location.locs, function(loc){
                    return '[data-location="'+loc+'"]';
                }).join(' ') + ' .focus-link';
                var left = $(e.target).position().left + this.overlayOffset().left;
                var top = $(e.target).position().top+ this.overlayOffset().top;
                if(this.getDocumentId(e.target) && !$target.is('.def-para')){
                    Actions.contextMenuOpened(this.props.viewer_id, page_id, {
                            title: this.getTitle(),
                            location: location,
                            govt_ids: govt_ids,
                            target_path: target_path,
                            id: target_path,
                            source_sel: selector,
                            left: left - popover_offset,
                            top: top,
                            query: {
                                document_id: this.getDocumentId(e.target),
                                location: location.repr,
                                doc_type: 'instrument',
                                find: 'location'
                            },
                        },
                        {left: e.pageX || left, top: e.pageY || top});
                }
            }
            else if(link.length){
                e.preventDefault();
                e.stopPropagation();
                if(link.attr('data-link-id') && link.attr('data-href')){
                    var url = link.attr('data-href');
                    if(url.indexOf('/') === -1){
                        url = 'instrument/'+url;
                    }
                    var location = Utils.getLocation(link);
                    var location_string = link.attr('data-location');
                    Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                            type: POPOVER_TYPES.LINK,
                            title: link.text() +' '+location.repr,
                            id: link.attr('data-link-id'),
                            target: link.attr('data-target-id'),
                            source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                            left: link.position().left + this.overlayOffset().left - popover_offset,
                            top:link.position().top+ this.overlayOffset().top,
                            fetched: false,
                            query: {
                                id: link.attr('data-target-id') || link.attr('data-href'),
                                doc_type: 'instrument',
                                find: location_string ? 'location' : 'preview',
                                location: location_string,
                                link_text: $(e.target).text(),
                                stack: this.popoverStack ? this.popoverStack() : null
                            },
                            query_string: '/link/'+url
                        });
                }
                if(link.attr('data-link-id') && link.attr('data-query')){

                    Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                            type: POPOVER_TYPES.LINK,
                            title: link.text(),
                            id: link.attr('data-link-id'),
                            left: link.position().left + this.overlayOffset().left - popover_offset,
                            top:link.position().top+ this.overlayOffset().top,
                            fetched: false,
                            query_string: link.attr('data-query'),
                            stack: this.popoverStack ? this.popoverStack() : null
                        });
                }
                else if(link.attr('data-def-id')){
                    var url = '/definition/'+link.attr('data-def-id');
                    if(link.attr('data-def-ex-id')){
                        url += '/' + link.attr('data-def-ex-id')
                    }
                   Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                        type: POPOVER_TYPES.DEFINITION,
                        title: link.text(),
                        id: link.attr('data-def-idx'),
                        left: link.position().left + this.overlayOffset().left - popover_offset,
                        top:link.position().top + this.overlayOffset().top,
                        source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                        fetched: false,
                        query_string: url,
                        stack: this.popoverStack ? this.popoverStack() : null
                    });
                }
            }
        }
};