{
  myDoc: {
    channels: { write: 'write' },
    typeFilter: function(doc) {
      return doc._id === 'myDoc';
    },
    propertyValidators: {
      staticValidationProp: {
        type: 'string',
        immutableWhenSet: true
      },
      dynamicPropertiesAreImmutable: {
        type: 'boolean',
        immutable: true
      },
      dynamicValidationProp: {
        type: 'integer',
        immutableWhenSet: function(doc, oldDoc, value, oldValue) {
          return oldDoc ? oldDoc.dynamicPropertiesAreImmutable : doc.dynamicPropertiesAreImmutable;
        }
      }
    }
  }
}
