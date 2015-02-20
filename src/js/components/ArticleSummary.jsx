var React = require('react/addons')
var _ = require('lodash')


var fields = [
    ['title', 'Title'],
    ['version', 'Version'],
    ['type', 'Type'],
    ['subtype', 'Subtype'],
    ['number', 'Number'],
    ['date_first_valid', 'Date First Valid'],
    ['date_assent', 'Date Assent'],
    ['date_gazetted', 'Date Gazetted'],
    ['date_terminated', 'Date Terminated'],
    ['date_imprint', 'Date Imprint'],
    ['date_signed', 'Date Signed'],
    ['year', 'Year'],
    ['repealed', 'Repealed'],
    ['in_amend', 'In Amend'],
    ['raised_by', 'Raised By'],
    ['stage', 'Stage'],
    ['imperial', 'Imperial'],
    ['offical', 'Official'],
    ['instrucing_office', 'Instrucing Office'],
];

module.exports = React.createClass({

	render: function(){
        return <div className="summary">
        <dl className="dl-horizontal">
            { _.map(fields, function(v){
                if(this.props.summary[v[0]])
                    return <div key={v[0]}><dt>{v[1]}</dt><dd>{this.props.summary[v[0]]}</dd></div>
            }.bind(this))}
            </dl>
        </div>
     },
    });