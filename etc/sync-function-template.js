// This sync function for Couchbase Sync Gateway was generated by synctos: https://github.com/Kashoo/synctos
// More info on sync functions: http://developer.couchbase.com/mobile/develop/guides/sync-gateway/sync-function-api-guide/index.html
function(doc, oldDoc) {
  // Determine if a given value is an integer. Exists as a failsafe because Number.isInteger is not guaranteed to exist in all environments.
  // Defined by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger#Polyfill
  var isInteger = Number.isInteger || function(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  };

  // Check that a given value is a valid ISO 8601 format date string
  function isIso8601DateString(dateString) {
    // Initially borrowed from http://www.pelagodesign.com/blog/2009/05/20/iso-8601-date-validation-that-doesnt-suck/
    // Heavily modified to simplify and remove regex features that were not supported by the Javascript regex parser. As a result, it is
    // not only significantly easier to comprehend but also less comprehensive than before.
    var regex = new RegExp('^(([\\+-]?[0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))([T ]([01][0-9]|2[0-4])(:[0-5][0-9])?(:[0-5][0-9])?([\\.,][0-9]{1,3})?)?([zZ]|([\\+-])([01][0-9]|2[0-3]):?([0-5][0-9])?)$');

    return regex.test(dateString);
  }

  // A document definition may define its channels for each operation (view, add, replace, delete) as either a string or an array of
  // strings. In either case, add them to the list if they are not already present.
  function appendToChannelList(allChannels, channelsToAdd) {
    if (channelsToAdd instanceof Array) {
      for (var i = 0; i < channelsToAdd.length; i++) {
        var channel = channelsToAdd[i];
        if (allChannels.indexOf(channel) < 0) {
          allChannels.push(channel);
        }
      }
    } else if (allChannels.indexOf(channelsToAdd) < 0) {
      allChannels.push(channelsToAdd);
    }
  }

  // A document definition may define its channels as either a function or an object/hashtable
  function getDocChannelMap(doc, oldDoc, docDefinition) {
    if (typeof(docDefinition.channels) === 'function') {
      return docDefinition.channels(doc, oldDoc);
    } else {
      return docDefinition.channels;
    }
  }

  // Retrieves a list of channels the document belongs to based on its specified type
  function getAllDocChannels(doc, oldDoc, docDefinition) {
    var docChannelMap = getDocChannelMap(doc, oldDoc, docDefinition);

    var allChannels = [ ];
    appendToChannelList(allChannels, docChannelMap.view);
    appendToChannelList(allChannels, docChannelMap.add);
    appendToChannelList(allChannels, docChannelMap.replace);
    appendToChannelList(allChannels, docChannelMap.remove);

    return allChannels;
  }

  // Ensures the user is authorized to create/replace/delete this document
  function authorize(doc, oldDoc, docDefinition) {
    var docChannelMap = getDocChannelMap(doc, oldDoc, docDefinition);

    var requiredChannels;
    if (doc._deleted) {
      requiredChannels = docChannelMap.remove;
    } else if (oldDoc) {
      requiredChannels = docChannelMap.replace;
    } else {
      requiredChannels = docChannelMap.add;
    }

    requireAccess(requiredChannels);
  }

  // Ensures the document structure and content are valid
  function validateDoc(doc, oldDoc, docDefinition, docType) {
    var validationErrors = [ ];

    // Execute each of the document's property validator functions
    validateProperties(doc, oldDoc, docDefinition.propertyValidators, null, doc, validationErrors);

    if (validationErrors.length > 0) {
      throw { forbidden: 'Invalid ' + docType + ' document: ' + validationErrors.join('; ') };
    }
  }

  function validateProperties(doc, oldDoc, propertyValidators, baseElementPath, baseElementValue, validationErrors) {
    var supportedProperties = [ ];
    for (var validatorIndex = 0; validatorIndex < propertyValidators.length; validatorIndex++) {
      var validator = propertyValidators[validatorIndex];
      var fullPropertyPath = baseElementPath ? baseElementPath + '.' + validator.propertyName : validator.propertyName;
      var propertyName = validator.propertyName;
      var propertyValue = baseElementValue[propertyName];

      supportedProperties.push(propertyName);

      validatePropertyValue(doc, oldDoc, validator, propertyName, fullPropertyPath, propertyValue, validationErrors);
    }

    // Verify there are no unsupported properties in the object
    var whitelistedProperties = [ '_id', '_rev', '_deleted', '_revisions', '_attachments' ];
    for (var propertyName in baseElementValue) {
      if (whitelistedProperties.indexOf(propertyName) >= 0) {
        // These properties are special cases that should always be allowed
        continue;
      }

      if (supportedProperties.indexOf(propertyName) < 0) {
        var fullPropertyPath = baseElementPath ? baseElementPath + '.' + propertyName : propertyName;
        validationErrors.push('property "' + fullPropertyPath + '" is not supported');
      }
    }
  }

  function validatePropertyValue(doc, oldDoc, validator, propertyName, propertyPath, elementValue, validationErrors) {
    if (validator.customValidation) {
      validator.customValidation(validationErrors, doc, oldDoc);
    }

    if (validator.immutable && !(doc._deleted) && oldDoc && !(oldDoc._deleted) && oldDoc[propertyName] !== elementValue) {
      validationErrors.push('property "' + propertyPath + '" may not be updated')
    }

    if (typeof elementValue !== 'undefined' && elementValue !== null) {
      if (validator.mustNotBeEmpty && elementValue.length < 1) {
        validationErrors.push('property "' + propertyPath + '" must not be empty');
      }

      if (typeof(validator.minimumValue) !== 'undefined' && validator.minimumValue !== null && elementValue < validator.minimumValue) {
        validationErrors.push('property "' + propertyPath + '" must not be less than ' + validator.minimumValue);
      }

      if (typeof(validator.maximumValue) !== 'undefined' && validator.maximumValue !== null && elementValue > validator.maximumValue) {
        validationErrors.push('property "' + propertyPath + '" must not be greater than ' + validator.maximumValue);
      }

      switch (validator.type) {
        case 'string':
          if (typeof elementValue !== 'string') {
            validationErrors.push('property "' + propertyPath + '" must be a string');
          } else if (validator.regexPattern) {
            if (!(validator.regexPattern.test(elementValue))) {
              validationErrors.push('property "' + propertyPath + '" must conform to expected format');
            }
          }
          break;
        case 'date':
          if (typeof elementValue !== 'string' || !isIso8601DateString(elementValue)) {
            validationErrors.push('property "' + propertyPath + '" must be an ISO 8601 date string');
          }
          break;
        case 'integer':
          if (!isInteger(elementValue)) {
            validationErrors.push('property "' + propertyPath + '" must be an integer');
          }
          break;
        case 'float':
          if (typeof elementValue !== 'number') {
            validationErrors.push('property "' + propertyPath + '" must be a floating point number');
          }
          break;
        case 'boolean':
          if (typeof elementValue !== 'boolean') {
            validationErrors.push('property "' + propertyPath + '" must be a boolean');
          }
          break;
        case 'object':
          if (typeof elementValue !== 'object') {
            validationErrors.push('property "' + propertyPath + '" must be an object');
          } else if (validator.propertyValidators) {
            validateProperties(doc, oldDoc, validator.propertyValidators, propertyPath, elementValue, validationErrors);
          }
          break;
        case 'array':
          validateArrayProperty(doc, oldDoc, validator.arrayElementsValidator, propertyPath, elementValue, validationErrors);
          break;
        case 'hashtable':
          validateHashtableProperty(
            doc,
            oldDoc,
            validator.hashtableKeysValidator,
            validator.hashtableValuesValidator,
            propertyPath,
            elementValue,
            validationErrors);
          break;
        case 'attachmentReference':
          validateAttachmentRefProperty(doc, oldDoc, validator, propertyPath, elementValue, validationErrors);
          break;
        default:
          // This is not a document validation error; the property validator is configured incorrectly and must be fixed
          throw({ forbidden: 'No data type defined for validator of property "' + propertyPath + '"' });
          break;
      }
    } else if (validator.required) {
      // The property has no value (either it's null or undefined), but the validator indicates it is required
      validationErrors.push('required property "' + propertyPath + '" is missing');
    }
  }

  function validateArrayProperty(doc, oldDoc, elementValidator, propertyPath, elementValue, validationErrors) {
    if (!(elementValue instanceof Array)) {
      validationErrors.push('property "' + propertyPath + '" must be an array');
    } else if (elementValidator) {
      // Validate each element in the array
      for (var elementIndex = 0; elementIndex < elementValue.length; elementIndex++) {
        var arrayElementName = '[' + elementIndex + ']';
        var arrayElementPath = propertyPath ? propertyPath + arrayElementName : arrayElementName;
        validatePropertyValue(
          doc,
          oldDoc,
          elementValidator,
          arrayElementName,
          arrayElementPath,
          elementValue[elementIndex],
          validationErrors);
      }
    }
  }

  function validateHashtableProperty(doc, oldDoc, keyValidator, valueValidator, propertyPath, elementValue, validationErrors) {
    if (typeof elementValue !== 'object') {
      validationErrors.push('property "' + propertyPath + '" must be an object/hashtable');
    } else {
      for (var hashtableKey in elementValue) {
        var hashtableValue = elementValue[hashtableKey];

        var hashtableElementName = '[' + hashtableKey + ']';
        var hashtableElementPath = propertyPath ? propertyPath + hashtableElementName : hashtableElementName;
        if (keyValidator) {
          if (typeof hashtableKey !== 'string') {
            validationErrors.push('hashtable key "' + hashtableElementPath + '" is not a string');
          } else {
            if (keyValidator.mustNotBeEmpty && hashtableKey.length < 1) {
              validationErrors.push('empty hashtable key in property "' + propertyPath + '" is not allowed');
            }
            if (keyValidator.regexPattern) {
              if (!(keyValidator.regexPattern.test(hashtableKey))) {
                validationErrors.push('hashtable key "' + hashtableElementPath + '" does not conform to expected format');
              }
            }
          }
        }

        if (valueValidator) {
          validatePropertyValue(
            doc,
            oldDoc,
            valueValidator,
            hashtableElementName,
            hashtableElementPath,
            hashtableValue,
            validationErrors);
        }
      }
    }
  }

  function validateAttachmentRefProperty(doc, oldDoc, validator, propertyPath, elementValue, validationErrors) {
    if (typeof elementValue !== 'string') {
      validationErrors.push('attachment property "' + propertyPath + '" must be a string');
    } else {
      if (validator.supportedExtensions) {
        var extRegex = new RegExp('\\.(' + validator.supportedExtensions.join('|') + ')$', 'i');
        if (!extRegex.test(elementValue)) {
          validationErrors.push('attachment property "' + propertyPath + '" must have a supported file extension (' + validator.supportedExtensions.join(',') + ')');
        }
      }

      // Because the addition of an attachment is typically a separate operation from the creation/update of the associated document, we
      // can't guarantee that the attachment is present when the attachment reference property is created/updated for it, so only
      // validate it if it's present. The good news is that, because adding an attachment is a two part operation (create/update the
      // document and add the attachment), the sync function will be run once for each part, thus ensuring the content is verified once
      // both parts have been synced.
      if (doc._attachments && doc._attachments[elementValue]) {
        var attachment = doc._attachments[elementValue];

        if (validator.supportedContentTypes && validator.supportedContentTypes.indexOf(attachment.content_type) < 0) {
            validationErrors.push('attachment property "' + propertyPath + '" must have a supported content type (' + validator.supportedContentTypes.join(',') + ')');
        }

        if (typeof(validator.maximumSize) !== 'undefined' && validator.maximumSize !== null && attachment.length > validator.maximumSize) {
          validationErrors.push('attachment property "' + propertyPath + '" must not be larger than ' + validator.maximumSize + ' bytes');
        }
      }
    }
  }

  var rawDocDefinitions = %SYNC_DOCUMENT_DEFINITIONS%;

  var docDefinitions;
  if (typeof rawDocDefinitions === 'function') {
    docDefinitions = rawDocDefinitions();
  } else {
    docDefinitions = rawDocDefinitions;
  }


  function getDocumentType(doc, oldDoc) {
    for (var docType in docDefinitions) {
      var docDefn = docDefinitions[docType];
      if (docDefn.typeFilter(doc, oldDoc)) {
        return docType;
      }
    }

    // The document type does not exist
    return null;
  }


  // Now put the pieces together
  var theDocType = getDocumentType(doc, oldDoc);

  if (theDocType == null) {
    throw({ forbidden: 'Unknown document type' });
  }

  var theDocDefinition = docDefinitions[theDocType];

  authorize(doc, oldDoc, theDocDefinition);

  // There's nothing to validate if the doc is being deleted
  if (!doc._deleted) {
    validateDoc(doc, oldDoc, theDocDefinition, theDocType);
  }

  // Getting here means the document write is authorized and valid, and the appropriate channels should now be assigned
  channel(getAllDocChannels(doc, oldDoc, theDocDefinition));
}
