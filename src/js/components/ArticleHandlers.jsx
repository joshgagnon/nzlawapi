var Actions = require('../actions/Actions');
var Utils = require('../utils');
var $ = require('jquery');


 module.exports =
    {
        interceptLink: function(e){
            var link = $(e.target).closest('a:not([target])');
            var page = this.props.page;
            if(link.length){
                e.preventDefault();
                if(link.attr('data-link-id')){
                    var url = link.attr('data-href');
                    if(url.indexOf('/') === -1){
                        url = 'instrument/'+url;
                    }
                    var location = Utils.getLocation(link);
                    Actions.popoverOpened(this.props.viewer_id, page.get('id'),
                        {
                            type: 'link',
                            title: link.text() +' '+location.repr,
                            id: link.attr('data-link-id'),
                            target: link.attr('data-target-id'),
                            source_sel: '[data-link-id="'+link.attr('data-link-id')+'"]',
                            positionLeft: link.position().left + this.getScrollContainer().scrollLeft(),
                            positionTop:link.position().top+ this.getScrollContainer().scrollTop(),
                            fetched: false,
                            query: {
                                id: link.attr('data-href'),
                                doc_type: 'instrument'
                            },
                            url: '/link/'+url
                        });
                }
                else if(link.attr('data-def-id')){
                    console.log('click')
                   Actions.popoverOpened(this.props.viewer_id, page.get('id'),
                        {
                        type: 'definition',
                        title: link.text(),
                        id: link.attr('data-def-idx'),
                        positionLeft: link.position().left + this.getScrollContainer().scrollLeft(),
                        positionTop:link.position().top + this.getScrollContainer().scrollTop(),
                        source_sel: '[data-def-idx="'+link.attr('data-def-idx')+'"]',
                        fetched: false,
                        url: '/definition/'+link.attr('data-def-id')
                    });
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
            else if($(e.target).is('span.label') && $(e.target).closest('[data-location]').length){
                var $target = $(e.target).closest('[data-location]')
                var location = Utils.getLocation($target);
                var title = page.getIn(['content', 'title']) +' '+ location.repr;
                Actions.popoverOpened(this.props.viewer_id, page.get('id'),
                        {
                        type: 'location',
                        title: title + ' '+ location.repr,
                        id: location.repr,
                        positionLeft: $target.position().left + this.getScrollContainer().scrollLeft(),
                        positionTop:$target.position().top + this.getScrollContainer().scrollTop(),
                        source_sel: Utils.locationsToSelector(location.locs),
                        fetched: false,
                        format: 'fragment',
                        url: Utils.queryUrlJSON({
                            document_id: page.getIn(['content', 'document_id']),
                            find: 'location',
                            location: location.repr,
                            doc_type: page.getIn(['content', 'doc_type'])
                        }),
                    });
            }
        }
};