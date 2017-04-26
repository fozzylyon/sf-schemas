'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const { S3 } = require('aws-sdk');

/**
 * Given a set of options, checks the current cache and conditionally downloads the requested schema version
 *
 * @param {object} options - fetch configuration options
 * @options {path, bucket, folder, version, s3Config }
 * @return {Promise} Resolves when either the current version matches the cached version OR it downloads and caches the required version
 */
module.exports = (options) => {
  return new Promise((resolve, reject) => {
    options = Object.assign({
      path: '',
      bucket: '',
      folder: '',
      version: '',
      s3Config: {},
    }, options);

    const { path, bucket, folder, version, s3Config } = options;
    const s3 = new S3(s3Config);
    const prefix = `${ folder }/${ version }/`;
    
    fs.readFile(`${ path }/.version`, 'utf8', (error, cachedVersion) => {
      if (error && error.code !== 'ENOENT') {
        return reject(error);
      }
      else if (cachedVersion && cachedVersion === version) {
        return resolve(true);
      }

      return resolve(false);
    });
  })
    .then((found) => {
      if (found === true) {
        return true;
      }

      return s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
      }).promise()
        // map keys to remove prefix
        .then(({ Contents }) => Contents.map((obj) => obj.Key.replace(prefix, '')))
        // write s3 files to disk
        .then((objects) => {
          try {
            fs.mkdirSync(path);
          }
          catch (error) {

          }

          return Promise.each(objects, (obj) => new Promise((resolve) => {
            s3.getObject({
              Bucket: bucket,
              Key: `${ prefix }${ obj }`,
            }).createReadStream()
              .pipe(fs.createWriteStream(`${ path }/${ obj }`).on('finish', () => resolve(obj)));
          }));
        })
        .then(() => {
          return new Promise((resolve) => {
          fs.writeFile(`${ path }/.version`, version, 'utf8', () => resolve());

          return resolve(true);
        })
      });
    });
};
