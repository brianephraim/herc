/* eslint-disable no-console */
const inquirer = require('inquirer');
const exec = require('child-process-promise').exec;
const fs = require('fs-extra');
const generatePackageDotJsonContent = require('./generatePackageDotJsonContent');

function makeJsFile (repoName, folderPath, flavor, extra = () => { return ''; }) {
  const filename = `${repoName}${flavor ? '.' + flavor : ''}.js`;
  const fileContent = `/* eslint-disable no-console */
import ${repoName} from './${repoName}';
console.log('logging from ${filename}', ${repoName});
${extra({ repoName, flavor, filename})}
`;

  fs.writeFileSync(`${folderPath}${filename}`, fileContent);
}

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



  makeJsFile(details.repoName, details.folderPath, null, ({repoName, flavor, filename}) => {
    return `// repo name: ${repoName}
// npm name: ${details.nameWithScope}

console.log('hey there from ${repoName} -- ${details.nameWithScope}');
export default '${repoName} -- ${details.nameWithScope}';`
  });


  makeJsFile(details.repoName, details.folderPath, 'test', ({repoName, flavor, filename}) => {
    return `test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});`
  });


  makeJsFile(details.repoName, details.folderPath, 'demo', ({repoName, flavor, filename}) => {
    return `console.log('logging data retrieved from "./${repoName}" as ${repoName} within  "${filename}" .  The value is "' + ${repoName} + '" .');`
  });

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