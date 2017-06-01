/* eslint-disable no-plusplus */
/* eslint-disable no-console */

const createRepo = require('./createRepo');

const argv = require('yargs').argv;

const exec = require('child-process-promise').exec;

function updateRemoteRepos(reposNeedingCommits) {
  let i = 0;
  const recurse = () => {
    if (i < reposNeedingCommits.length) {
      const j = i;
      i++;

      const packageFolderName = reposNeedingCommits[j].packageFolderName;
      console.info(`Processing ${packageFolderName} as a repo`);

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
        // console.log(reposNeedingCommits)
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
          #if [[ $(${gitRepo} status) =~ "Initial commit" || $(${gitRepo} ls-files -m | head -c1 | wc -c) -ne 0 ]]; then 
            # IF SO COMMIT CHANGES AND PUSH
            ${gitRepo} add -A .;
            ${gitRepo} commit -m "${argv.m}";
            ${gitRepo} push -u origin eject-test;
          #fi

          # ALL DONE WITH RECENTLY CLONED REPO, DELETE IT
          # rm -rf ${tempRepo};
        `);
      })
      /*
      */
      .then(({stdout}) => {
        console.log('<<>>')
        console.log(stdout)
        console.info(`Done processing ${packageFolderName}.`);
        console.log('------------')
        console.log('------------')
        console.log('------------')
        console.log('------------')
        return recurse();
      });
    }
    return reposNeedingCommits;
  };
  return recurse();
}

module.exports = updateRemoteRepos;
