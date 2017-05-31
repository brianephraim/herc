/* eslint-disable comma-dangle */

const fs = require('fs-extra');

const exec = require('child-process-promise').exec;

const inquirer = require('inquirer');

inquirer.prompt(['hey wha is up']).then(function (answers) {
    // Use user feedback for... whatever!! 
    console.log('AND THE ANSERS ARE');
    console.log('answers', answers);
});
// const a = fs.readJsonSync('./asdfasdf.json');
// console.log('AAAAA',a)

function initPackageDotJson(repoName) {
  let packageDotJsonContents;
  exec(`curl https://registry.npmjs.org/@defualt%2F${repoName}/`).then(({error, stdout}) => {
    const repoAvailable = JSON.parse(stdout).error === 'Not Found';
    console.log('error', error);
    console.log('gggg',repoAvailable);
    console.log('stdout', JSON.parse(stdout));
    console.log('stdout', typeof stdout);
  });
  exec(`curl https://github.com/defualt/${repoName}/`).then(({error, stdout}) => {
    const repoAvailable = stdout === 'Not Found';
  });
  // Promise.all
  try {
    
  } catch (e) {
    console.log('eee',e);
  }

  // throw 'asdf';

}
initPackageDotJson('hercx');

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
