/* eslint-disable comma-dangle */

const fs = require('fs-extra');

const exec = require('child-process-promise').exec;

function createRepo(repoName, token) {
  return exec(`curl -H "Authorization: token ${token}" https://api.github.com/user/repos -d '{"name":"${repoName}"}'`)
  .then(({ error, stdout }) => {
    if (error) {
      return Promise.reject(new Error(error));
    }
    const response = JSON.parse(stdout);
    if (response.errors && response.errors.length) {
      return Promise.reject(new Error(stdout));
    }
    const packageDotJsonPath = `./packages/${repoName}/package.json`;
    const packageDotJsonContents = fs.readJsonSync(packageDotJsonPath);
    const devEnvVersion = fs.readJsonSync('./packages/dev_env/package.json').version;
    Object.assign(packageDotJsonContents, {
      repository: {
        type: 'git',
        url: response.clone_url,
      },
      version: packageDotJsonContents.version || '0.0.1',
      publishConfig: {
        access: 'public',
      },
      devDependencies: Object.assign(
        (repoName !== 'dev_env' ? { '@defualt/dev_env': `^${devEnvVersion}` } : {}),
        packageDotJsonContents.devDependencies
      ),
    });
    fs.writeJsonSync(packageDotJsonPath, packageDotJsonContents, { spaces: 2 });
    return {
      packageFolderName: repoName,
      repoUrl: response.clone_url,
    };
  });
}

module.exports = createRepo;
