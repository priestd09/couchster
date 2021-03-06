{
  explicitRolesDoc: {
    authorizedRoles: {
      add: 'add',
      replace: [ 'replace', 'update' ],
      remove: [ 'remove', 'delete' ]
    },
    typeFilter: function(doc) {
      return doc._id === 'explicitRolesDoc';
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  writeOnlyRolesDoc: {
    authorizedRoles: {
      write: [ 'edit', 'modify', 'write' ]
    },
    typeFilter: function(doc) {
      return doc._id === 'writeOnlyRolesDoc';
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  writeAndAddRolesDoc: {
    authorizedRoles: {
      write: 'edit',
      add: 'add'
    },
    typeFilter: function(doc) {
      return doc._id === 'writeAndAddRolesDoc';
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  dynamicRolesAndUsersDoc: {
    typeFilter: function(doc) {
      return doc._id === 'dynamicRolesAndUsersDoc';
    },
    authorizedRoles: function(doc, oldDoc, dbName) {
      var rolesList = oldDoc ? oldDoc.roles : doc.roles;

      return {
        write: rolesList.map(function(role) { return dbName + '-' + role; })
      };
    },
    authorizedUsers: function(doc, oldDoc, dbName) {
      var usersList = oldDoc ? oldDoc.users : doc.users;

      return {
        write: usersList.map(function(username) { return dbName + '-' + username; })
      };
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      },
      roles: {
        type: 'array'
      },
      users: {
        type: 'array'
      }
    }
  },
  explicitUsernamesDoc: {
    typeFilter: function(doc) {
      return doc._id === 'explicitUsernamesDoc';
    },
    authorizedUsers: {
      add: [ 'add1', 'add2' ],
      replace: [ 'replace1', 'replace2' ],
      remove: [ 'remove1', 'remove2' ]
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  replaceOnlyRoleDoc: {
    authorizedRoles: {
      replace: 'replace'
    },
    typeFilter: function(doc) {
      return doc._id === 'replaceOnlyRoleDoc';
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  addOnlyRoleDoc: {
    authorizedRoles: {
      add: 'add'
    },
    typeFilter: function(doc) {
      return doc._id === 'addOnlyRoleDoc';
    },
    propertyValidators: {
      stringProp: {
        type: 'string'
      }
    }
  },
  staticUniversalAccessDoc: {
    typeFilter: function(doc) {
      return doc._id === 'staticUniversalAccessDoc';
    },
    grantAllMembersWriteAccess: true,
    propertyValidators: {
      floatProp: {
        type: 'float'
      }
    }
  },
  dynamicUniversalAccessDoc: {
    typeFilter: function(doc) {
      return doc._id === 'dynamicUniversalAccessDoc';
    },
    grantAllMembersWriteAccess: function(doc, oldDoc, dbName) {
      if (dbName === 'all-members-write-access-db') {
        return true;
      } else if (oldDoc) {
        return oldDoc.allowAccess;
      } else {
        return doc.allowAccess;
      }
    },
    propertyValidators: {
      allowAccess: {
        type: 'boolean'
      }
    }
  }
}
