'use strict';

const Promise = require('bluebird');
const jsforce = require('jsforce');
const { S3 } = require('aws-sdk');
const debug = require('debug');

const log = debug('sf-schemas:create');

function referenceFieldReplacer(match, standardSuffix, customSuffix, offset, string) {
  if (standardSuffix) {
    return '';
  }

  if (customSuffix) {
    return '__r';
  }

  return '';
}

/**
 * Given a set of options, gets salesforce object metadata and uploads to s3
 *
 * @param {object} options - fetch configuration options
 * @options {objectNames, region, bucket, folder, sfConfig}
 * @return {Promise} Resolves when the schema is created and uploaded to S3
 */
module.exports = (options) => {
  options = Object.assign({
    objectNames: [],
    region: '',
    bucket: '',
    folder: '',
    nested: true,
    sfConfig: {},
  }, options);

  log(options);

  const { objectNames, region, bucket, folder, nested, sfConfig } = options;
  const conn = new jsforce.Connection({ loginUrl: sfConfig.uri, accessToken: sfConfig.token });
  const s3 = new S3({ region });

  function describe(obj) {
    return new Promise((resolve, reject) => {
      conn.sobject(obj).describe((error, sobj) => {
        if (error) {
          return reject(error);
        }

        return resolve(sobj.fields.map(({ defaultValue, deprecatedAndHidden, label, length, name, nillable, picklistValues, referenceTo, restrictedPicklist, type, updateable, filterable, createable }) => ({ defaultValue, deprecatedAndHidden, label, length, name, nillable, picklistValues, referenceTo, restrictedPicklist, type, updateable, filterable, createable })));
      });
    });
  }

  return new Promise((resolve, reject) => {
    return conn.login(sfConfig.user, sfConfig.password + sfConfig.token, (error) => {
      if (error) {
        log(error);

        return reject(error);
      }

      return resolve();
    });
  })
    // describe all objectNames
    .then(() => {
      return Promise.each(objectNames, (objectName) => {
        return describe(objectName)
          .then((fields) => {
            const referencePromises = [ fields ];

            if (!nested) {
              return referencePromises;
            }

            // if desired, also get nested fields on the object
            fields.forEach((f) => {
              if (f.type !== 'reference') {
                return;
              }

              const fieldName = f.name.replace(/(Id$)|(__c$)/gm, referenceFieldReplacer);

              f.referenceTo.forEach((ref) => {
                if (ref === objectName) {
                  return;
                }

                const promise = describe(ref)
                  .then((subFields) => subFields.map((subF) => {
                    subF.name = `${ fieldName}.${ subF.name }`;
                    subF.nested = true;

                    return subF;
                  }));

                referencePromises.push(promise);
              });
            });

            return Promise.all(referencePromises);
          })
          // merge all fields together
          .then((nestedFields) => {
            const fields = nestedFields.reduce((all, fields) => [ ...all, ...fields ], []);

            return { fileName: `${ objectName }.json`, data: JSON.stringify(fields, null, 2) };
          })
          // upload
          .then(({ fileName, data }) => {
            const path = `${ folder }/${ fileName }`;

            log(`Writing ${ fileName } to ${ folder }`);

            return s3.putObject({
              Bucket: bucket,
              Key: path,
              Body: data,
              ContentType: 'application/json',
            }).promise();
          })
          .catch((error) => {
            log(error);

            // Don't fail completely on a single missing schema
            if (error.name === 'NOT_FOUND') return;

            throw error;
          });
      });
    })
};
