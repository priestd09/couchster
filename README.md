# Introduction

Synctos is a utility to aid with the process of designing sync functions for [Couchbase](http://www.couchbase.com/) [Sync Gateway](http://developer.couchbase.com/documentation/mobile/current/get-started/sync-gateway-overview/index.html) 1.x. With it, you define all your JSON document formats declaratively in a structured JavaScript object format that eliminates much of the boilerplate normally required for sync functions with comprehensive validation of document contents and permissions. Not only is it invaluable in protecting the integrity of the documents that are stored in a Sync Gateway database, whenever a document fails validation, the sync function will return a detailed error message that makes it easy to figure out exactly what went wrong.

# Installation

Synctos is distributed as an npm package and has several npm dependencies. As such, it requires [Node.js](https://nodejs.org/) to run.

To add synctos to your project, run `npm install synctos` from the project's root directory to install the package locally. Or, better yet, if you define a package.json in your project, you can run `npm install synctos --savedev` to automatically install and insert the package into your package.json's developer dependencies.

For more info on npm package management, see the official npm documentation for [Installing npm packages locally](https://docs.npmjs.com/getting-started/installing-npm-packages-locally) and [Using a `package.json`](https://docs.npmjs.com/getting-started/using-a-package.json).

# Usage

### Running

Once synctos is installed, you can run it from your project's directory as follows:

    node_modules/synctos/make-sync-function /path/to/my-document-definitions.js /path/to/my-generated-sync-function.js

This will take the sync document definitions that are defined in `/path/to/my-document-definitions.js` and build a new [sync function](http://developer.couchbase.com/documentation/mobile/current/develop/guides/sync-gateway/sync-function-api-guide/index.html) that is output to `/path/to/my-generated-sync-function.js`.

The generated sync function contents can then be inserted into the definition of a bucket/database in a Sync Gateway [configuration file](http://developer.couchbase.com/documentation/mobile/current/develop/guides/sync-gateway/configuring-sync-gateway/config-properties/index.html#story-h2-3) as a multi-line string surrounded with backquotes (\`).

**NOTE**: Due to a [known issue](https://github.com/couchbase/sync_gateway/issues/1866) in Sync Gateway versions up to and including 1.2.1, when specifying a bucket/database's sync function in a configuration file as a multi-line string, you will have to be sure to escape any literal backslash characters in the sync function body. For example, if your sync function contains a regular expression like `new RegExp('\\w+')`, you will have to escape the backslashes when inserting the sync function into the configuration file so that it becomes `new RegExp('\\\\w+')`.

### Definition file

A document definition file contains all the document types that belong to a single Sync Gateway bucket/database. A file can contain either a plain JavaScript object or a JavaScript function that returns the documents' definitions wrapped in an object.

For example, a document definition file implemented as an object:

    {
      myDocType1: {
        channels: {
          view: 'view',
          add: 'add',
          replace: 'change',
          remove: 'delete'
        },
        typeFilter: function(doc, oldDoc) {
          if (oldDoc) {
            return doc.type === oldDoc.type && oldDoc.type === 'myDocType1';
          } else {
            return doc.type === 'myDocType1';
          }
        },
        propertyValidators: [
          {
            propertyName: 'type',
            type: 'string',
            required: true
          },
          {
            propertyName: 'myProp1',
            type: 'integer'
          }
        ]
      },
      myDocType2: {
        channels: {
          view: 'view',
          add: 'add',
          replace: 'change',
          remove: 'delete'
        },
        typeFilter: function(doc, oldDoc) {
          if (oldDoc) {
            return doc.type === oldDoc.type && oldDoc.type === 'myDocType2';
          } else {
            return doc.type === 'myDocType2';
          }
        },
        propertyValidators: [
          {
            propertyName: 'type',
            type: 'string',
            required: true
          },
          {
            propertyName: 'myProp2',
            type: 'datetime'
          }
        ]
      }
    }

Or a functionally equivalent document definition file implemented as a function:

    function() {
      var sharedChannels = {
        view: 'view',
        add: 'add',
        replace: 'change',
        remove: 'delete'
      };
      var typePropertyValidator = {
        propertyName: 'type',
        type: 'string',
        required: true
      };

      function makeDocTypeFilter(doc, oldDoc, docType) {
        return function(doc, oldDoc) {
          if (oldDoc) {
            return doc.type === oldDoc.type && oldDoc.type === docType;
          } else {
            return doc.type === docType;
          }
        };
      }

      return {
        myDocType1: {
          channels: sharedChannels,
          typeFilter: makeDocTypeFilter(doc, oldDoc, 'myDocType1'),
          propertyValidators: [
            typePropertyValidator,
            {
              propertyName: 'myProp1',
              type: 'integer'
            }
          ]
        },
        myDocType2: {
          channels: sharedChannels,
          typeFilter: makeDocTypeFilter(doc, oldDoc, 'myDocType2'),
          propertyValidators: [
            typePropertyValidator,
            {
              propertyName: 'myProp2',
              type: 'datetime'
            }
          ]
        }
      };
    }

As seen above, the advantage of defining a function rather than an object is that you may define variables and functions that can be shared between document types, but the choice is ultimately yours.

### Specifications

In the case of either file format, the document definitions object must conform to the following specification. See the `samples/` directory for some example definitions.

At the top level, the object contains a property for each document type that is to be supported by the Sync Gateway bucket. For example:

    {
      myDocType1: { ... },
      myDocType2: { ... },
      myDocType3: { ... }
    }

##### Document types:

Each document type is specified as an object with the following properties:

* `channels`: (required) The [channels](http://developer.couchbase.com/documentation/mobile/current/develop/guides/sync-gateway/channels/index.html) to assign to documents of this type. Defined as an object with required `view`, `add`, `replace` and `remove` properties, each of which may be either an array of channel names or a single channel name as a string. For example:

    channels: {
      view: [ 'admin', 'readonly' ],
      add: 'admin',
      replace: 'admin',
      remove: 'admin'
    }

* `typeFilter`: (required) A function that is used to identify documents of this type. It accepts as function parameters both the new document and the old document that is being replaced/deleted (if any). For example:

    typeFilter: function(doc, oldDoc) {
      if (oldDoc) {
        return doc.type === oldDoc.type && oldDoc.type === 'foo';
      } else {
        return doc.type === 'foo';
      }
    }

* `propertyValidators`: (required) An array of validators that specify the format of each of the document type's supported properties. Each property must declare a name and a type and, optionally, some number of parameters. For example:

    propertyValidators: [
      {
        propertyName: 'myProp1',
        type: 'boolean',
        required: true
      },
      {
        propertyName: 'myProp2',
        type: 'array',
        mustNotBeEmpty: true
      }
    ]

* `allowAttachments`: (optional) Whether to allow the addition of [file attachments](http://developer.couchbase.com/documentation/mobile/current/develop/references/sync-gateway/rest-api/document-public/put-db-doc-attachment/index.html) for the document type. Defaults to `false` to prevent malicious/misbehaving clients from polluting the bucket/database with unwanted files.

##### Validation:

There are a number of validation types that can be used to define each property/element/key's expected format in a document.

NOTE: All object property validators support the following parameters:

  * `required`: The property cannot be null or undefined. Defaults to `false`.
  * `immutable`: The property cannot be altered from its existing value if the document is being replaced. Does not apply when creating a new document or deleting an existing document. Defaults to `false`.

In addition, all object property, hashtable value or array element validators can include custom validation via the following parameter:

  * `customValidation`: A function that accepts as parameters an ongoing list of validation errors, the new document and the old document that is being replaced/deleted (if any). Generally, custom validation should not throw exceptions; it's better to add an error description to the supplied list so that the client can see descriptions for all validation errors that were encountered once full validation is complete. For example:

    {
      propertyName: 'myStringProp',
      type: 'string'
    },
    {
      propertyName: 'myCustomProp',
      type: 'integer',
      maximumValue: 100,
      customValidation: function(validationErrors, doc, oldDoc) {
        if (doc.myStringProp && !(doc.myCustomProp)) {
          validationErrors.push('property myCustomProp must be defined when myProp1 is defined');
        }
      }
    }

Validation types for simple data types:

* `string`: The value is a string of characters. Additional parameters:
  * `mustNotBeEmpty`: If `true`, an empty string is not allowed. Defaults to `false`.
  * `regexPattern`: A regular expression pattern that must be satisfied for values to be accepted (e.g. `new RegExp('\\d+')`). Undefined by default.
* `integer`: The value is a number with no fractional component. Additional parameters:
  * `minimumValue`: The smallest (inclusive) value that is allowed. Undefined by default.
  * `maximumValue`: The largest (inclusive) value that is allowed. Undefined by default.
* `float`: The value is a number with an optional fractional component (i.e. it is either an integer or a floating point number). Additional parameters:
  * `minimumValue`: The smallest (inclusive) value that is allowed. Undefined by default.
  * `maximumValue`: The largest (inclusive) value that is allowed. Undefined by default.
* `boolean`: The value is either `true` or `false`. No additional parameters.
* `datetime`: The value is an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date string with optional time and time zone components (e.g. "2016-06-18T18:57:35.328-08:00"). No additional parameters.
* `date`: The value is an ISO 8601 date string _without_ time and time zone components (e.g. "2016-06-18"). No additional parameters.
* `attachmentReference`: The value is the name of one of the document's file attachments. Note that, because the addition of an attachment is often a separate Sync Gateway API operation from the creation/replacement of the associated document, this validation type is only applied if the attachment is actually present in the document. However, since the sync function is run twice in such situations (i.e. once when the document is created/replaced and once when the attachment is created/replaced), the validation will be performed eventually. Additional parameters:
  * `supportedExtensions`: An array of case-insensitive file extensions that are allowed for the attachment's filename (e.g. "txt", "jpg", "pdf"). No restriction by default.
  * `supportedContentTypes`: An array of content/MIME types that are allowed for the attachment's contents (e.g. "image/png", "text/html", "application/json"). No restriction by default.
  * `maximumSize`: The maximum file size, in bytes, of the attachment. May not be greater than 20MB (20,971,520 bytes), as Couchbase Server/Sync Gateway sets that as the hard limit per document or attachment. Undefined by default.

Validation types for complex data types, which can include nested validation types:

* `array`: An array/list of elements. Additional parameters:
  * `mustNotBeEmpty`: If `true`, an array with no elements is not allowed. Defaults to `false`.
  * `arrayElementsValidator`: The validation that is applied to each element of the array. Any validation type may be used. Undefined by default. For example:

    {
      propertyName: 'myArray1',
      type: 'array',
      arrayElementsValidator: {
        type: 'string',
        regexPattern: new RegExp('[A-Za-z0-9_-]+')
      }
    }

* `object`: An object that is able to declare which properties it supports so that unrecognized properties are rejected. Additional parameters:
  * `propertyValidators`: An array of properties that are supported by the object. Any validation type may be used for each property. Undefined by default. For example:

    {
      propertyName: 'myObj1',
      type: 'object',
      propertyValidators: [
        {
          propertyName: 'myProp1',
          type: 'date',
          immutable: true
        },
        {
          propertyName: 'myProp2',
          type: 'integer',
          minimumValue: 1
        }
      ]
    }

* `hashtable`: An object/hash that, unlike the `object` type, does not declare the names of the properties it supports. Additional parameters:
  * `hashtableKeysValidator`: The validation that is applied to the keys in the object/hash. Undefined by default. Additional parameters:
    * `mustNotBeEmpty`: If `true`, empty key strings are not allowed. Defaults to `false`.
    * `regexPattern`: A regular expression pattern that must be satisfied for key strings to be accepted. Undefined by default.
  * `hashtableValuesValidator`: The validation that is applied to the values in the object/hash. Undefined by default. Any validation type may be used. For example:

    {
      propertyName: 'myHash1',
      type: 'hashtable',
      hashtableKeysValidator: {
        mustNotBeEmpty: false,
        regexPattern: new RegExp('\\w+')
      },
      hashtableValuesValidator: {
        type: 'object',
        required: true,
        propertyValidators: [
          {
            propertyName: 'mySubObjProp1',
            type: 'string'
          }
        ]
      }
    }
