var React = require('react/addons')
var _ = require('lodash')


var fields = [
    ['title', 'Title'],
    ['type', 'Type'],
    ['sub_type', 'Subtype'],
    ['version', 'Version'],
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



var format = function(field, value){
    if(field === 'in_amend'){
        return value ? 'Yes': 'No';
    }
    if(field === 'type'){
        return _.capitalize(value)
    }
    if(field === 'sub_type'){
        return _.capitalize(value)
    }
    return value;
}

module.exports = React.createClass({
    propTypes: {
        summary: React.PropTypes.object.isRequired
    },
    render: function(){
        return <div className="summary">
        <dl className="dl-horizontal">
            { _.map(fields, function(v){
                if(this.props.summary.get(v[0])){
                    return <div key={v[0]}><dt>{v[1]}</dt>
                        <dd>{format(v[0], this.props.summary.get(v[0]))}</dd>
                    </div>
                }
            }.bind(this))}
            </dl>
        </div>
    },
});
