const exec = require('child-process-promise').exec;

function mkdirPassthrough(reposNeedingCommits) {
  if (reposNeedingCommits && reposNeedingCommits.length) {
    return exec('rm -rf tempRepos && mkdir tempRepos').then(() => {
      return reposNeedingCommits;
    });
  }
  return Promise.reject(new Error('No repos'));
}

module.exports = mkdirPassthrough;
