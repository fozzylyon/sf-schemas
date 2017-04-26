# sf-schemas
Salesforce schema management.  For use with saline, a salesforce ODM

## Installation
`npm i --save sf-schemas`

## Example usage
```javascript

const { fetch, create } = require('sf-schemas');

fetch({
  path: `${ __dirname }/schemas`,
  region: 'us-west-1',
  bucket: 'my-app',
  folder: 'server/3.2.4',
  version: '3.2.4',
})
.then(() => {
  // server startup
});

// ...

create({
  objectNames: [ 'Lead', 'Opportunity' ],
  region: 'us-west-1',
  bucket: 'my-app',
  folder: 'server/3.2.4',
  version: '3.2.4',
  sfConfig: {
    uri: '',
    username: '',
    password: '',
    token: '',
  },
});
```

## Example output
```json
[
  {
    "defaultValue": null,
    "deprecatedAndHidden": false,
    "label": "Lead ID",
    "length": 18,
    "name": "Id",
    "nillable": false,
    "picklistValues": [],
    "referenceTo": [],
    "restrictedPicklist": false,
    "type": "id",
    "updateable": false,
    "filterable": true,
    "createable": false
  },
  {
    "defaultValue": null,
    "deprecatedAndHidden": false,
    "label": "Deleted",
    "length": 0,
    "name": "IsDeleted",
    "nillable": false,
    "picklistValues": [],
    "referenceTo": [],
    "restrictedPicklist": false,
    "type": "boolean",
    "updateable": false,
    "filterable": true,
    "createable": false
  },
  {
    "defaultValue": null,
    "deprecatedAndHidden": false,
    "label": "Master Record ID",
    "length": 18,
    "name": "MasterRecordId",
    "nillable": true,
    "picklistValues": [],
    "referenceTo": [
      "Lead"
    ],
    "restrictedPicklist": false,
    "type": "reference",
    "updateable": false,
    "filterable": true,
    "createable": false
  },
  {
    "defaultValue": null,
    "deprecatedAndHidden": false,
    "label": "Last Name",
    "length": 80,
    "name": "LastName",
    "nillable": false,
    "picklistValues": [],
    "referenceTo": [],
    "restrictedPicklist": false,
    "type": "string",
    "updateable": true,
    "filterable": true,
    "createable": true
  }
]
```