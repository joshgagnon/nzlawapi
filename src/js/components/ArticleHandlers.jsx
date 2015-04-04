var Actions = require('../actions/Actions');
var Utils = require('../utils');
var $ = require('jquery');


 module.exports =
    {
        interceptLink: function(e){
            var link = $(e.target).closest('a:not([target])');
            var page = this.props.page;
            var page_id = page ? page.get('id') : this.props.page_id;
            var popover_offset = 250;

            if($(e.target).closest('.focus-link').length){
                e.preventDefault();
                e.stopPropagation();
                var $target = $(e.target);
                var location = Utils.getLocation($target);
                var govt_ids = $target.parent().find('[id]').map(function(){
                    return this.attributes.id.textContent;
                }).toArray();
                Actions.contextMenuOpened(this.props.viewer_id, {
                        location: location,
                        govt_ids: govt_ids,
                        query:{
                            document_id: this.getDocumentId(e.target),
                            location: location.repr,
                        },
                    },
                    {left: e.pageX, top: e.pageY});
                return;


               /* var $target = $(e.target).closest('[data-location]')
                var location = Utils.getLocation($target);
                var title = page.getIn(['content', 'title']) +' '+ location.repr;
                Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                        type: 'location',
                        title: title + ' '+ location.repr,
                        id: location.repr,
                        left: $target.position().left + this.overlayOffset().left - popover_offset,
                        top: $target.position().top + this.overlayOffset().top,
                        source_sel: Utils.locationsToSelector(location.locs),
                        fetched: false,
                        format: 'fragment',
                        query_string: Utils.queryUrlJSON({
                            document_id: page.getIn(['content', 'document_id']),
                            find: 'location',
                            location: location.repr,
                            doc_type: page.getIn(['content', 'doc_type'])
                        }),
                    });*/
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
                    Actions.popoverOpened(this.props.viewer_id, page_id,
                        {
                            type: 'link',
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
                                find: 'preview'
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
                        source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                        fetched: false,
                        query_string: '/definition/'+link.attr('data-def-id')
                    });
                }
                // TODO refactor this crazy behaviour
                else if(link.parent().hasClass('catalex-src')){
                    if(this.openLinksInTabs){
                        Actions.newPage({
                            title: link.text(),
                            query_string: link.attr('href').replace('/open_article', ''),
                        }, this.props.viewer_id)
                    }
                    else{
                        Actions.popoverOpened(this.props.viewer_id, page_id,
                            {
                                type: 'link',
                                title: link.text(),
                                id: link.attr('data-link-id'),
                                target: link.attr('data-target-id'),
                                source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                                left: link.position().left + this.overlayOffset().left - popover_offset,
                                top:link.position().top+ this.overlayOffset().top,
                                fetched: false,
                                query_string: link.attr('href').replace('/open_article', '')
                            });
                        }
                }
                else if(link.closest('[id]').length){
                    var $target = link.closest('[id]');
                    var title = page.getIn(['content', 'title']) + ' ' + $target.attr('data-location') ;
                    var ids = $target.find('[id]').map(function(){
                        return this.attributes.id.textContent;
                    }).toArray();
                    ids.push($target.attr('id'));
                    Actions.sectionSummaryOpened(
                        this.props.viewer_id,
                        page.get('id'),
                        {id: $target.attr('id'),
                        document_id: page.getIn(['content', 'document_id']),
                        title: page.getIn(['content', 'title']) +' '+ Utils.getLocation($target).repr,
                        govt_ids: ids
                    });
                }
            }
        }
};