/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable comma-dangle */
/* eslint-disable no-lonely-if */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */


require('pretty-error').start();

const argv = require('yargs').argv;

const fs = require('fs-extra');

const exec = require('child-process-promise').exec;

const getPackageFolderNames = require('./getPackageFolderNames');
const filterOutNonRepos = require('./filterOutNonRepos');
const mkdirPassthrough = require('./mkdirPassthrough');
const updateRemoteRepos = require('./updateRemoteRepos');

module.exports = () => {
  if (argv.m) {
    getPackageFolderNames()
    .then(filterOutNonRepos)
    .then(mkdirPassthrough)
    .then(updateRemoteRepos)
    .catch((e) => {
      console.log('CAUGHT!!', e);
    });
  } else {
    console.error('You must provide a commit message like ` -m "some message"`');
  }
};
