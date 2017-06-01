const path = require('path');
const fs = require('fs-extra');
function generatePackageDotJsonContent(settings) {
  const toExtend = settings.toExtend || {};
  const devEnvVersion = fs.readJsonSync(path.resolve(__dirname, '../package.json')).devDependencies['@defualt/dev_env'];

  const devDependencies = {
    devDependencies: Object.assign(
      (settings.repoName !== 'dev_env' ? { '@defualt/dev_env': devEnvVersion } : {}),
      toExtend.devDependencies
    ),
  };

  const repository = settings.url ? {
    repository: {
      type: 'git',
      url: settings.url,
    }
  } : {};

  const name = settings.name ? {
    name: settings.name,
  } : {};
  /*
    useScope,
    isPrivate,
    nameWithScope,
    repoName,
    folderPath,
  */
  const publishConfigOrPrivate = !settings.isPrivate ? {
    publishConfig: {
      access: 'public',
    }
  } : {
    private: true
  };

  

  const version = {
    version: toExtend.version || '0.0.1'
  };
  return Object.assign(toExtend, name, version, repository, publishConfigOrPrivate, devDependencies);
}

module.exports = generatePackageDotJsonContent;
