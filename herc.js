/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable comma-dangle */
/* eslint-disable no-lonely-if */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */


require('pretty-error').start();

const argv = require('yargs').argv;

const fs = require('fs-extra');

const exec = require('child-process-promise').exec;

function getChangedPackages() {
  return exec(
    // 'git ls-files -m'
    'ls ./packages/'
  ).then(({ stdout }) => {
    // const packagesWithChanges = Object.keys(
    //   stdout.split('\n').reduce((accum, filePath) => {
    //     console.log('filePath',filePath);
    //     if (filePath.indexOf('packages/') === 0) {
    //       const packageFolderName = filePath.split('/')[1];
    //       accum[packageFolderName] = true;
    //     }
    //     return accum;
    //   }, {})
    // );
    const packagesWithChanges = stdout.split('\n');
    return packagesWithChanges;
  });
}

function determineReposStatuses(packagesWithChanges) {
  const reposStatuses = packagesWithChanges.reduce((statuses, packageFolderName) => {
    try {
      const packageDotJsonContents = fs.readJsonSync(`./packages/${packageFolderName}/package.json`);
      if (!packageDotJsonContents || packageDotJsonContents.private) {
        statuses.private.push({
          packageFolderName,
        });
      } else {
        if (packageDotJsonContents.repository && packageDotJsonContents.repository.url) {
          statuses.reposNeedingCommits.push({
            packageFolderName,
            repoUrl: packageDotJsonContents.repository.url,
          });
        } else {
          statuses.reposNeedingCommits.push({
            packageFolderName,
          });
        }
      }
    } catch (error) {
      statuses.noPackageDotJson.push({
        packageFolderName,
      });
    }
    return statuses;
  }, {
    reposNeedingCommits: [],
    private: [],
    noPackageDotJson: [],
  });
  return reposStatuses.reposNeedingCommits;
}

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
        url: response.clone_url
      },
      version: packageDotJsonContents.version || '0.0.1',
      publishConfig: {
        access: 'public'
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

function createRepos(reposStatuses) {
  const promises = reposStatuses.noRepo.map((info) => {
    const repoName = info.packageFolderName;
    return createRepo(repoName, process.env.GITHUB_API_TOKEN);
  });
  if (promises.length) {
    return Promise.all(promises).then((modifiedNoRep) => {
      const repos = reposStatuses.hasRepo.concat(modifiedNoRep);
      return repos;
    });
  }
  return reposStatuses.hasRepo;
}

function mkdirPassthrough(reposNeedingCommits) {
  if (reposNeedingCommits && reposNeedingCommits.length) {
    return exec('rm -rf tempRepos && mkdir tempRepos').then(() => {
      return reposNeedingCommits;
    });
  }
  // return reposNeedingCommits;
}

function recurseRepos(reposNeedingCommits) {
  let i = 0;
  const recurse = () => {
    if (i < reposNeedingCommits.length) {
      const j = i;
      i++;

      const packageFolderName = reposNeedingCommits[j].packageFolderName;

      // TRY TO CREATE A NEW REPO ON GITHUB WITH THE NAME VIA packageFolderName 
      return createRepo(packageFolderName, process.env.GITHUB_API_TOKEN)
      // IF THAT REPO NAME ALREADY EXISTS ON GITHUB, EVERYTHING IS ACTUALLY FINE
      // PROCEED WITH COMMITTING TO IT
      .catch((response) => {
        if (
          response &&
          response.message
        ) {
          const responseParsed = JSON.parse(response.message);
          if (
            responseParsed.errors &&
            responseParsed.errors[0] &&
            responseParsed.errors[0].message &&
            responseParsed.errors[0].message === 'name already exists on this account'
          ) {
            return Promise.resolve();
          }
        }
        return response;
      })
      .then((createRepoResponse) => {
        const repoUrl = reposNeedingCommits[j].repoUrl || createRepoResponse.repoUrl;
        const tempRepo = `./tempRepos/${packageFolderName}`;
        const gitRepo = `git -C ${tempRepo}`;
        return exec(`
          # CLONE THE REPO
          git -C ./tempRepos clone ${repoUrl};

          # CHECKOUT THE SPECIAL BRANCH (ALSO ENSURE EXISTENCE)
          ${gitRepo} checkout -b eject-test origin/eject-test 2>/dev/null || ${gitRepo} checkout -b eject-test;

          # PRESERVE THE .git FOLDER FROM OUR RECENTLY CLONED REPO FOLDER
          ls ./tempRepos;

          mv ${tempRepo}/.git ./tempRepos;

          # REMOVE ALL THE FILES FROM THAT REPO FOLDER (.git FOLDER IS SAFE)
          rm -rf ${tempRepo};

          # COPY THE APPOPRIATE FILES FROM THE MONOREPO INTO OUR RECENTLY CLONED NON-MONO REPO FOLDER
          cp -r ./packages/${packageFolderName} ${tempRepo};

          # COPY SOME FILES FROM THE MONOREPO ROOT INTO THE RECENTLY CLONED NON-MONO REPO FOLDER
          cp ./.gitignore ${tempRepo}/.gitignore;
          cp ./.eslintrc ${tempRepo}/.eslintrc;
          cp ./.babelrc ${tempRepo}/.babelr;

          # MOVE THE PRESERVED .git FOLDER BACK INTO THE RECENTLY CLONED REPO FOLDER
          mv ./tempRepos/.git ${tempRepo}/.git;

          # CHECK IF THE RECENTLY CLONED REPO IS A BRAND NEW OR
          # CHECK IF THERE ARE CHANGES TO THE RECENTLY CLONED REPO VIA THE COPY FROM THE MONOREPO
          # https://stackoverflow.com/a/35165216
          if [[ $(${gitRepo} status) =~ "Initial commit" || $(${gitRepo} ls-files -m | head -c1 | wc -c) -ne 0 ]]; then 
            # IF SO COMMIT CHANGES AND PUSH
            ${gitRepo} add -A .;
            ${gitRepo} commit -m "${argv.m}";
            ${gitRepo} push -u origin eject-test;
          fi

          # ALL DONE WITH RECENTLY CLONED REPO, DELETE IT
          rm -rf ${tempRepo};
        `);
      })
      /*
      */
      .then(() => {
        return recurse();
      });
    }
    return reposNeedingCommits;
  };
  return recurse();
}

if (argv.m) {
  getChangedPackages()
  .then(determineReposStatuses)
  .then(mkdirPassthrough)
  .then(recurseRepos)
  .catch((e) => {
    console.log('CAUGHT!!', e);
  });
} else {
  console.error('You must provide a commit message like ` -m "some message"`');
}
