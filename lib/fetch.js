'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const { S3 } = require('aws-sdk');
const debug = require('debug');

const log = debug('sf-schemas:fetch');
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

  log(options);

  const { path, region, bucket, folder, version } = options;
  const s3 = new S3({ region });

  return new Promise((resolve, reject) => {

    fs.readFile(`${ path }/.version`, 'utf8', (error, cachedVersion) => {
      if (error && error.code !== 'ENOENT') {
        log(error);

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
        return fs.readdirSync(path).reduce((objectNames, file) => {
          if (file.includes('.json')) {
            objectNames.push(file.replace('.json', ''));
          }
          return objectNames;
        }, []);
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
            log(error);
          }

          return Promise.each(objects, (obj) => new Promise((resolve) => {
            s3.getObject({
              Bucket: bucket,
              Key: `${ folder }${ obj }`,
            }).createReadStream()
              .pipe(fs.createWriteStream(`${ path }/${ obj }`).on('finish', () => resolve(obj)));
          }))
          .then(() => objects);
        })
        .then((objects) => {

          return new Promise((resolve) => {
            if (!objects || !objects.length) {
              // Don't reject but don't write .version file
              // Let application code handle missing schemas
              return resolve(objects);
            }

            fs.writeFile(`${ path }/.version`, version, 'utf8', () => resolve());

            return resolve(objects);
          })
          .then((objects) => objects.map((object) => object.replace('.json', '')));
      });
    });
};
