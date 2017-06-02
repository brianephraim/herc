/* eslint-disable no-console */
const inquirer = require('inquirer');
const exec = require('child-process-promise').exec;
const fs = require('fs-extra');
const generatePackageDotJsonContent = require('./generatePackageDotJsonContent');

function survey() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'repoName',
      message: 'NAME your package/repo',
      default: () => {
        return 'Doe';
      },
      validate: (value) => {
        if (value) {
          return true;
        }

        return 'NAME your package/repo';
      },
    },
    {
      type: 'input',
      name: 'npmScope',
      message: (answersSoFar) => {
        return `NPM local scope? (prefix into @${process.env.NPM_SCOPE}/${answersSoFar.repoName} on npm) (default "yes")`;
      },
      default: () => {
        return 'yes';
      },
    },
    {
      type: 'input',
      name: 'private',
      message: 'Make it private? (Will not publish to NPM or Github).  (default "no")',
      default: () => {
        return 'no';
      },
    },
  ]);
}

function validate(answers) {
  const repoName = answers.repoName;
  const makeMsg = (exclamation, destination, name) => {
    return `${exclamation}!, ${destination}, ${name} is ${(exclamation === 'Bad' ? 'NOT ' : '')}available!`;
  };
  const useScope = answers.npmScope[0].toLowerCase() === 'y';
  const isPrivate = answers.private[0].toLowerCase() === 'y';
  const nameWithScope = useScope ? `@${process.env.NPM_SCOPE}/${repoName}` : repoName;
  const semiEncodedNameWithScope = useScope ? `@${process.env.NPM_SCOPE}${encodeURIComponent('/')}${repoName}` : repoName;
  const folderPath = `${process.cwd()}/packages/${repoName}/`;
  const validations = [];
  validations.push(Promise.resolve(fs.existsSync(folderPath)).then((folderExists) => {
    const folderAvailable = !folderExists;
    console.info(folderAvailable ? makeMsg('Good', 'folder', repoName) : makeMsg('Bad', 'folder', repoName));
    if (!folderAvailable) {
      return Promise.reject(`Folder already exists: packages/${repoName}`);
    }
    return folderAvailable;
  }));
  if (!isPrivate) {
    validations.push(
      exec(`curl https://registry.npmjs.org/${semiEncodedNameWithScope}/`).then(({ stdout }) => {
        const npmAvailable = !JSON.parse(stdout).name;
        console.info(npmAvailable ? makeMsg('Good', 'NPM', nameWithScope) : makeMsg('Bad', 'NPM', nameWithScope));
        if (!npmAvailable) {
          return Promise.reject(new Error(`NPM already exists: ${nameWithScope}`));
        }
        return npmAvailable;
      }),
      exec(`curl -s -o /dev/null -w "%{http_code}" https://github.com/${process.env.NPM_SCOPE}/${repoName}/`).then(({ stdout }) => {
        const repoAvailable = stdout !== '200';
        console.info(repoAvailable ? makeMsg('Good', 'Github', repoName) : makeMsg('Bad', 'Github', repoName));
        if (!repoAvailable) {
          return Promise.reject(new Error(`Github project already exists: ${repoName}`));
        }
        return repoAvailable;
      })
    );
  }
  return Promise.all(validations).then(() => {
    console.log('ALLL GOOOOD');
    return {
      useScope,
      isPrivate,
      nameWithScope,
      repoName,
      folderPath,
    };
  });
}

function boilerplateFolder(details) {
  console.log(details.folderPath);
  fs.mkdirSync(details.folderPath);

  const packageDotJsonContent = generatePackageDotJsonContent({
    name: details.nameWithScope,
    isPrivate: details.isPrivate,
  });
  fs.writeJsonSync(`${details.folderPath}package.json`, packageDotJsonContent, { spaces: 2 });

const jsFileContent = `// repo name: ${details.repoName}
// npm name: ${details.nameWithScope}
console.log('hey there from ${details.repoName} -- ${details.nameWithScope}');
export default '${details.repoName} -- ${details.nameWithScope}';
`;

  fs.writeFileSync(`${details.folderPath}${details.repoName}.js`, jsFileContent);


const testFileContent = `// import ${details.repoName} from ./${details.repoName};
// const ${details.repoName} = require('./${details.repoName}');
test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});
`;

  fs.writeFileSync(`${details.folderPath}${details.repoName}.test.js`, testFileContent);

  const readmeFileContent = `experimental - use with caution  \nrepoName: ${details.repoName}  \nnpm name: ${details.nameWithScope}  \n`;
  fs.writeFileSync(`${details.folderPath}README.md`, readmeFileContent);
}


module.exports = () => {
  survey()
  .then(validate)
  .then(boilerplateFolder)
  .catch((r) => {
    console.log('\x1b[31m', 'INIT PACKAGE FAILED', r, '\x1b[0m');
  });
};