"use strict";
var Actions = require('./actions/Actions');
var superagent = require('superagent');
var Promise = require('promise');

superagent.Request.prototype.promise = function() {
    var end = this.end;
    var context = this;
    return new Promise(function(accept, reject) {
        end.call(context, function(err, value) {
            value = value || {};
            if(err || !value.ok){
                if(value.status === 503) {
                    // Trigger unavailable modal here
                    Actions.setError('unavailable');
                }
                else if(value.status === 403) {
                    Actions.setError('logged-out');
                }
                // more status code tests here
                return reject(value);
            }
            return accept(value);
        });
    });
};

module.exports = superagent;