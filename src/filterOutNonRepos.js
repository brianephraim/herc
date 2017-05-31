const fs = require('fs-extra');

function filterOutNonRepos(packageFolderNames) {
  return packageFolderNames.reduce((repos, packageFolderName) => {
    try {
      const packageDotJsonContents = fs.readJsonSync(`./packages/${packageFolderName}/package.json`);
      if (packageDotJsonContents && !packageDotJsonContents.private) {
        const repoUrl = (
          packageDotJsonContents.repository && packageDotJsonContents.repository.url
        ) ? packageDotJsonContents.repository.url : null;

        repos.push({
          packageFolderName,
          repoUrl,
        });
      }
    } catch (error) {
      null;
    }
    return repos;
  }, []);
}

module.exports = filterOutNonRepos;
