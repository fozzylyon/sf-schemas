'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const { S3 } = require('aws-sdk');

/**
 * Given a set of options, checks the current cache and conditionally downloads the requested schema version
 *
 * @param {object} options - fetch configuration options
 * @options {path, region, bucket, folder, version }
 * @return {Promise} Resolves when either the current version matches the cached version OR it downloads and caches the required version
 */
module.exports = (options) => {
  options = Object.assign({
    path: '',
    region: '',
    bucket: '',
    folder: '',
    version: '',
  }, options);

  const { path, region, bucket, folder, version } = options;
  const s3 = new S3({ region });

  return new Promise((resolve, reject) => {
    
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
        Prefix: folder,
      }).promise()
        // map keys to remove folder
        .then(({ Contents }) => Contents.map((obj) => obj.Key.replace(folder, '')))
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
              Key: `${ folder }${ obj }`,
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
