const exec = require('child-process-promise').exec;

function getPackageFolderNames() {
  return exec('ls ./packages/')
  .then(({ stdout }) => {
    const packageFolderNames = stdout.split('\n');
    return packageFolderNames;
  });
}
module.exports = getPackageFolderNames;
