'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var Deque = require('collections/deque');
var dbx = require('debug')('loglyzer:direct-aggregator');

var Server = function Server(kwargs) {
  var _deque = new Deque();
  var _interceptors = [];
  var _accumulator = {};

  Object.defineProperty(this, 'accumulator', {
    get: function() {
      return _accumulator;
    },
    set: function(val) {}
  });

  this.collect = function(packet) {
    return _deque.push(packet);
  }

  this.process = function() {
    var _ec = 0;
    var _process = function() {
      if (_deque.length > 0) {
        _ec = 0;
        dbx.enabled && dbx('process the next packet');
        var packet = _deque.pop();
        var flow = Promise.resolve(true);
        if (kwargs.preterior) {
          flow = flow.then(function() {
            return kwargs.preterior(packet, _accumulator);
          });
        }
        flow = flow.then(function(continued) {
          if (continued === false) return continued;
          return Promise.mapSeries(_interceptors, function(interceptor, index) {
            return interceptor(packet, _accumulator);
          }).then(function() {
            return continued;
          }).catch(function(error) {
            return Promise.resolve(continued);
          });
        });
        if (kwargs.posterior) {
          flow = flow.then(function(continued) {
            if (continued === false) return continued;
            return kwargs.posterior(packet, _accumulator);
          });
        }
        flow = flow.then(function(continued) {
          if (continued === false) return { ok: true };
          return _process();
        })
        return flow;
      } else {
        _ec += 1;
        if (_ec <= kwargs.failAfter) {
          dbx.enabled && dbx('queue is empty, retry at loop #%s', _ec);
          return Promise.resolve().delay(kwargs.waitingFor).then(_process);
        } else {
          dbx.enabled && dbx('queue is empty, reject at loop #%s', _ec);
          return Promise.reject({
            ok: false,
            counter: _ec,
            loopMax: kwargs.failAfter,
            delay: kwargs.waitingFor
          });
        }
      }
    }
    return _process();
  }

  this.addInterceptor = function(f) {
    if (typeof(f) === 'function' && _interceptors.indexOf(f) < 0) {
      _interceptors.push(f);
      dbx.enabled && dbx('addInterceptor() - ok');
      return true;
    } else {
      dbx.enabled && dbx('addInterceptor() - failed');
    }
    return false;
  }

  this.removeInterceptor = function(f) {
    var pos = _interceptors.indexOf(f);
    if (pos >= 0) {
      _interceptors.splice(pos, 1);
      return true;
    }
    return false;
  }

  this.clearInterceptors = function() {
    _interceptors.length = 0;
    return true;
  }

  kwargs = kwargs || {};
  kwargs.failAfter = kwargs.failAfter || 10;
  kwargs.waitingFor = kwargs.waitingFor || 1000;
  lodash.forEach(kwargs.interceptors, this.addInterceptor);
}

module.exports = Server;
