const argv = require('yargs').argv;

const publish = require('./src/publish');
const initPackage = require('./src/initPackage');

if (argv.m) {
  publish();
}

if (argv.i) {
  initPackage();
}
