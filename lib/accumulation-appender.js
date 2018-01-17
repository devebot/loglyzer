'use strict';

var accumulationAppender = function(mappings, accumulator, packet) {
  var logobj = packet;
  var tags = packet._tags_;
  if (isInvalidHelper(mappings, accumulator, logobj)) return;
  for(var i=0; i<mappings.length; i++) {
    var matchingField = mappings[i].matchingField;
    var pickedFields = mappings[i].selectedFields;
    var counterField = mappings[i].counterField;
    var storageField = mappings[i].storageField;
    var p1 = matchField(logobj[matchingField], mappings[i].filter);
    var p2 = matchTags(tags, mappings[i].anyTags, mappings[i].allTags);
    if (checkConditionals(p1, p2)) {
      if (counterField) {
        accumulator[counterField] = (accumulator[counterField] || 0) + 1;
      }
      if (storageField) {
        accumulator[storageField] = accumulator[storageField] || [];
        if (pickedFields) {
          if (!(pickedFields instanceof Array)) {
            pickedFields = [pickedFields];
          }
          var output = {};
          pickedFields.forEach(function(field) {
            output[field] = logobj[field];
          });
          accumulator[storageField].push(output);
        } else {
          accumulator[storageField].push(LogConfig.clone(logobj));
        }
      }
    }
  }
  return accumulator;
}

var checkConditionals = function() {
  var ok = false;
  for(var i =0; i<arguments.length; i++) {
    if (arguments[i] === true) {
      ok = true;
    } else if (arguments[i] === false) {
      ok = false;
      break;
    }
  }
  return ok;
}

var isInvalidHelper = function(mappings, accumulator, logobj) {
  if (!accumulator || !(typeof accumulator === 'object')) return true;
  if (!mappings || !(mappings instanceof Array)) return true;
  if (!logobj || !(typeof logobj === 'object')) return true;
  return false;
}

var hasAnyTags = function(tags, anyTags) {
  if (!(tags instanceof Array)) return false;
  for(var i=0; i<anyTags.length; i++) {
    if (typeof anyTags[i] === 'string') {
      if (tags.indexOf(anyTags[i]) >= 0) return true;
    } else
    if (anyTags[i] instanceof RegExp && tags.some(function(element) {
      return element.match(anyTags[i]) != null;
    })) return true;
  }
  return false;
}

var hasAllTags = function(tags, allTags) {
  if (!(tags instanceof Array)) return false;
  for(var i=0; i<allTags.length; i++) {
    if (typeof allTags[i] === 'string') {
      if (tags.indexOf(allTags[i]) < 0) return false;
    } else
    if (allTags[i] instanceof RegExp) {
      if (tags.every(function(element) {
        return element.match(allTags[i]) == null;
      })) return false;
    } else return false;
  }
  return true;
}

var matchTags = function(tags, anyTags, allTags) {
  if (typeof(tags) === 'string') tags = [tags];
  var passed = null;
  if (passed !== false && anyTags) {
    if (typeof(anyTags) === 'string') anyTags = [anyTags];
    if (anyTags instanceof Array) {
      passed = hasAnyTags(tags, anyTags);
    }
  }
  if (passed !== false && allTags) {
    if (typeof(allTags) === 'string') allTags = [allTags];
    if (allTags instanceof Array) {
      passed = hasAllTags(tags, allTags);
    }
  }
  return passed;
}

var matchField = function(checkpoint, filter) {
  var passed = null;
  if (filter instanceof RegExp) {
    passed = (typeof checkpoint === 'string') && (checkpoint.match(filter) != null);
  } else
  if (filter instanceof Array) {
    passed = (filter.indexOf(checkpoint) >= 0);
  } else
  if (filter instanceof Function) {
    passed = (filter.call(null, checkpoint) == true);
  } else
  if (typeof filter === 'string') {
    passed = (checkpoint == filter);
  }
  return passed;
}

module.exports = accumulationAppender;
