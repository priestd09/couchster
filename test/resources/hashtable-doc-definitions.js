function() {
  function isNonEmpty(doc, oldDoc, value, oldValue) {
    return doc.dynamicKeysMustNotBeEmpty;
  }

  function dynamicRegexPattern(doc, oldDoc, value, oldValue) {
    return new RegExp(doc.dynamicKeyRegex);
  }

  function dynamicSizeConstraint(doc, oldDoc, value, oldValue) {
    return doc.dynamicSize;
  }

  return {
    hashtableDoc: {
      channels: { write: 'write' },
      typeFilter: function(doc) {
        return doc._id === 'hashtableDoc';
      },
      propertyValidators: {
        staticSizeValidationProp: {
          type: 'hashtable',
          minimumSize: 2,
          maximumSize: 2
        },
        dynamicSize: {
          type: 'integer'
        },
        dynamicSizeValidationProp: {
          type: 'hashtable',
          minimumSize: dynamicSizeConstraint,
          maximumSize: dynamicSizeConstraint
        },
        staticNonEmptyKeyValidationProp: {
          type: 'hashtable',
          hashtableKeysValidator: {
            mustNotBeEmpty: true
          }
        },
        dynamicKeysMustNotBeEmpty: {
          type: 'boolean'
        },
        dynamicNonEmptyKeyValidationProp: {
          type: 'hashtable',
          hashtableKeysValidator: {
            mustNotBeEmpty: isNonEmpty
          }
        },
        staticKeyRegexPatternValidationProp: {
          type: 'hashtable',
          hashtableKeysValidator: {
            regexPattern: /^[a-zA-Z]+$/
          }
        },
        dynamicKeyRegex: {
          type: 'string'
        },
        dynamicKeyRegexPatternValidationProp: {
          type: 'hashtable',
          hashtableKeysValidator: {
            regexPattern: dynamicRegexPattern
          }
        }
      }
    }
  };
}
