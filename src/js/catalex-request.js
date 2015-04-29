"use strict";

var Actions = require('./actions/Actions');
var CataLexRequest = require('superagent-bluebird-promise');

// Create a temporary promise to access its prototype
var Promise = CataLexRequest.Request.prototype.promise();

var oldCatch = Promise.__proto__['catch'];

Promise.__proto__.caught = Promise.__proto__['catch'] = function(error) {
    var promise = this;
    // Queue up execution for after error type is 'settled'
    promise.lastly(function() {
        var error = promise._settledValue;
        if(typeof error === 'object' && error.name === 'SuperagentPromiseError') {
            if(error.status == 503) {
                // Trigger unavailable modal here
                Actions.setUnavailable(true);
            }
        }
    });

    return oldCatch.apply(this, arguments);
};

// Get rid of the temporary promise and take no action on catch - avoids 'unhandled rejection' event
Promise.catch(function() {}).cancel();

module.exports = CataLexRequest;
