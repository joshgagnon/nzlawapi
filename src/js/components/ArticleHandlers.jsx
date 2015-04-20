var Actions = require('../actions/Actions');
var Utils = require('../utils');
var $ = require('jquery');
var _ = require('lodash');

// must implement getDocumentId, overlayOffset

 module.exports =
    {
        interceptLink: function(e){
            var link = $(e.target).closest('a:not([target])');
            var page = this.props.page;
            var page_id = page ? page.get('id') : this.props.page_id;
            var popover_offset = 250;
            if(this.getDocumentId && $(e.target).closest('.focus-link').length && page){
                e.preventDefault();
                e.stopPropagation();
                var $target = $(e.target).closest('[id]');
                var location = Utils.getLocation($(e.target));
                var govt_ids = $target.parent().find('[id]').map(function(){
                    return this.attributes.id.textContent;
                }).toArray();
                Actions.contextMenuOpened(this.props.viewer_id, page_id, {
                        title: page.getIn(['content', 'title']),
                        location: location,
                        govt_ids: govt_ids,
                        id: $target.attr('id'),
                        query:{
                            document_id: this.getDocumentId(e.target),
                            location: location.repr,
                            doc_type: 'instrument',
                            find: 'location'
                        },
                    },
                    {left: e.pageX, top: e.pageY});
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
                    var location_string = link.attr('data-location')
                    Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                            type: 'link',
                            title: link.text() +' '+location.repr,
                            id: link.attr('data-link-id'),
                            target: link.attr('data-target-id'),
                            source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                            left: link.position().left + this.overlayOffset().left - popover_offset,
                            top:link.position().top+ this.overlayOffset().top,
                            time: (new Date()).getTime(),
                            fetched: false,
                            query: {
                                id: link.attr('data-target-id') || link.attr('data-href'),
                                doc_type: 'instrument',
                                find: location_string ? 'location' : 'preview',
                                location: location_string
                            },
                            query_string: '/link/'+url
                        });
                }
                else if(link.attr('data-def-id')){
                   Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                        type: 'definition',
                        title: link.text(),
                        id: link.attr('data-def-idx'),
                        left: link.position().left + this.overlayOffset().left - popover_offset,
                        top:link.position().top + this.overlayOffset().top,
                        time: (new Date()).getTime(),
                        source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                        fetched: false,
                        query_string: '/definition/'+link.attr('data-def-id')
                    });
                }
            }
        }
};