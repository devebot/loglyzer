'use strict';

var DirectAggregator = require('./lib/direct-aggregator');

module.exports = {
  accumulationAppender: require('./lib/accumulation-appender'),
  getAggregator: function(kwargs) {
    return new DirectAggregator(kwargs);
  }
};
