var React = require('react/addons');
var Button = require('react-bootstrap/Button');
var Modal = require('react-bootstrap/Modal');
var OverlayMixin = require('react-bootstrap/OverlayMixin');
var $ = require('jquery');


// this is in its own file because im sure it is not the way to solve this problem
var DefModal = React.createClass({
  mixins: [OverlayMixin],
  getInitialState: function () {
    return {
      isModalOpen: false
    };
  },
  handleToggle: function () {
    this.setState({
      isModalOpen: !this.state.isModalOpen
    });
  },
  opened: function(){
    this.setState({
      isModalOpen: true
    });
    this.props.opened();
  },
  render: function () {
    return (
      <Button onClick={this.opened} bsSize="xsmall" className="show-more">Show More</Button>
    );
  },
  // This is called by the `OverlayMixin` when this component
  // is mounted or updated and the return value is appended to the body.
  renderOverlay: function () {
    if (!this.state.isModalOpen) {
      return <span/>;
    }
    return (
        <Modal {...this.props} title={"Definition: "+this.props.title}  onRequestHide={this.handleToggle}>
           <div className="modal-body">
            <div dangerouslySetInnerHTML={{__html:this.props.html}}/>
            </div>
          <div className="modal-footer">
            <Button onClick={this.handleToggle}>Close</Button>
          </div>
        </Modal>
      );
  }
});

    var initPopover = function(){
            var self = this;
            $(this.getDOMNode()).popover({
               container:   '.act_browser, .legislation-result',
                placement: 'auto',
                trigger: 'click',
                selector: '[data-toggle="popover"]',
                template: '<div class="popover def-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title">'+
                    '</h3><div class="popover-close">&times;</div><div class="popover-content"></div><div class="popover-footer">' +
                    '</div></div>',
                content: function(){
                    return self.props.definitions[$(this).attr('def-id')].html;
                },
                title: function(){
                    return self.props.definitions[$(this).attr('def-id')].title;
                }
            }).on('show.bs.popover', function(e){
                //fucking hackjob
                var $target = $(e.target);
                var data = self.props.definitions[$target.attr('def-id')];
                var opened = function(){
                    $target.popover('hide');
                }
                var closed= function(){
                    //React.unmountComponentAtNode($target.data('bs.popover').$tip.find('.popover-footer')[0]);
                }
                var button = <DefModal title={data.title} html={data.html} opened={opened} onRequestHide={closed}/>;
                React.render(button,
                    $target.data('bs.popover').$tip.find('.popover-footer')[0]);

            }).on('shown.bs.popover', function(e){
                var $target = $(e.target);
                $target.data('bs.popover').$tip
                    .on('click', '.popover-close', function(){
                        $target.popover('hide')
                    })
                    .on('click', '.show-more', function(){
                    });
                });
         }
module.exports = {
    DefMixin: {
        componentDidMount: initPopover
        }
    }
    DefModal: DefModal