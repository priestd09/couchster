// This validation function for Apache CouchDB was generated by couchster: https://github.com/OldSneerJaw/couchster
function(newDoc, oldDoc, userContext, securityInfo) {
  // Whether the given value is either null or undefined
  function isValueNullOrUndefined(value) {
    return value === void 0 || value === null;
  }

  // Whether the given document is missing/nonexistant (i.e. null or undefined) or deleted (its "_deleted" property is true)
  function isDocumentMissingOrDeleted(candidate) {
    return isValueNullOrUndefined(candidate) || candidate._deleted;
  }

  // A property validator that is suitable for use on type identifier properties. Ensures the value is a string, is neither null nor
  // undefined, is not an empty string and cannot be modified.
  var typeIdValidator = {
    type: 'string',
    required: true,
    mustNotBeEmpty: true,
    immutable: true
  };

  // A type filter that matches on the document's type property
  function simpleTypeFilter(newDoc, oldDoc, candidateDocType) {
    if (oldDoc) {
      if (newDoc._deleted) {
        return oldDoc.type === candidateDocType;
      } else {
        return newDoc.type === oldDoc.type && oldDoc.type === candidateDocType;
      }
    } else {
      return newDoc.type === candidateDocType;
    }
  }

  // Add the specified padding to the right of the given string value until its length matches the desired length
  function padRight(value, desiredLength, padding) {
    while (value.length < desiredLength) {
      value += padding;
    }

    return value;
  }

  // Determine if a given value is an integer. Exists because Number.isInteger is not supported by CouchDB's JavaScript engine.
  function isValueAnInteger(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }

  // Retrieves the effective value of a top-level document constraint (e.g. "channels", "documentIdRegexPattern", "accessAssignments")
  function resolveDocumentConstraint(constraintDefinition) {
    if (typeof constraintDefinition === 'function') {
      var dbName = userContext ? userContext.db : null;

      return constraintDefinition(newDoc, oldDoc, dbName);
    } else {
      return constraintDefinition;
    }
  }

  var utils = {
    isDocumentMissingOrDeleted: isDocumentMissingOrDeleted,
    isValueAnInteger: isValueAnInteger,
    isValueNullOrUndefined: isValueNullOrUndefined,
    padRight: padRight,
    resolveDocumentConstraint: resolveDocumentConstraint
  };

  // The document authorization module is responsible for verifying the user's permissions (e.g. roles, usernames)
  var authorizationModule = importValidationFunctionFragment('./authorization-module.js')(utils);

  // The document validation module is responsible for verifying the document's contents
  var validationModule = importValidationFunctionFragment('./validation-module.js')(utils, simpleTypeFilter, typeIdValidator);

  var rawDocDefinitions = $DOCUMENT_DEFINITIONS$;

  var docDefinitions;
  if (typeof rawDocDefinitions === 'function') {
    docDefinitions = rawDocDefinitions();
  } else {
    docDefinitions = rawDocDefinitions;
  }

  function getDocumentType() {
    for (var docType in docDefinitions) {
      var docDefn = docDefinitions[docType];
      if (docDefn.typeFilter(newDoc, oldDoc, docType)) {
        return docType;
      }
    }

    // The document type does not exist
    return null;
  }

  // Now put the pieces together
  var theDocType = getDocumentType();

  if (isValueNullOrUndefined(theDocType)) {
    if (newDoc._deleted && authorizationModule.isAdminUser(userContext, securityInfo)) {
      // Attempting to delete a document whose type is unknown. This may occur if the document belongs to a type that existed
      // in a previous version of the document definitions but has since been removed. Only an admin may proceed.
      return;
    } else {
      throw { forbidden: 'Unknown document type' };
    }
  }

  var theDocDefinition = docDefinitions[theDocType];

  var customActionMetadata = {
    documentTypeId: theDocType,
    documentDefinition: theDocDefinition
  };

  if (theDocDefinition.customActions && typeof theDocDefinition.customActions.onTypeIdentificationSucceeded === 'function') {
    theDocDefinition.customActions.onTypeIdentificationSucceeded(newDoc, oldDoc, customActionMetadata, userContext, securityInfo);
  }

  customActionMetadata.authorization = authorizationModule.authorize(newDoc, oldDoc, userContext, securityInfo, theDocDefinition);

  if (theDocDefinition.customActions && typeof theDocDefinition.customActions.onAuthorizationSucceeded === 'function') {
    theDocDefinition.customActions.onAuthorizationSucceeded(newDoc, oldDoc, customActionMetadata, userContext, securityInfo);
  }

  validationModule.validateDoc(newDoc, oldDoc, userContext, securityInfo, theDocDefinition, theDocType);

  if (theDocDefinition.customActions && typeof theDocDefinition.customActions.onValidationSucceeded === 'function') {
    theDocDefinition.customActions.onValidationSucceeded(newDoc, oldDoc, customActionMetadata, userContext, securityInfo);
  }
}
