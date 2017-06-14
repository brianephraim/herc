/* eslint-disable no-console */
/* eslint-disable comma-dangle */

const caseUtlity = require('case');
const inquirer = require('inquirer');
const exec = require('child-process-promise').exec;
const fs = require('fs-extra');
const generatePackageDotJsonContent = require('./generatePackageDotJsonContent');

function makeJsFile({
  folderPath, flavor, nameWithScope, casedFileName, casedVariableName,
  extension, overrideFilename, instructions = []
}) {
  const dotFlavor = `.${flavor}`;
  const filename = `${overrideFilename || casedFileName}${flavor ? dotFlavor : ''}.${extension || 'js'}`;
  const fileContent = instructions.reduce((lines, instruction) => {
    const doers = {
      noConsole: () => {
        return '/* eslint-disable no-console */';
      },
      preferTemplate: () => {
        return '/* eslint-disable prefer-template */';
      },
      noUndef: () => {
        return '/* eslint-disable no-undef */';
      },
      import: () => {
        return `import ${casedVariableName} from './${casedFileName}';\n`;
      },
      export: () => {
        return `export default '(exported value from ${casedFileName})';`;
      },
      importLog: () => {
        return `console.log('logging from ${casedFileName}', ${casedVariableName});`;
      },
      complexLog: () => {
        return `console.log('logging data retrieved from "./${casedFileName}" as ${casedVariableName} within  "${filename}" .  The value is "' + ${casedVariableName} + '" .');`;
      },
      simpleLog: () => {
        return `console.log('logging from ${casedFileName}');`;
      },
      test: () => {
        return `${''}test('adds 1 + 2 to equal 3', () => { expect(1 + 2).toBe(3); });`;
      },
      readme: () => {
        return [
          'experimental - use with caution  ',
          `repoName: ${casedFileName}  `,
          `\`npm install ${nameWithScope}\`  `,
          `\`import ${casedVariableName} from '${nameWithScope}';\`  `,
          `\`var ${casedVariableName} = require('${nameWithScope}');\`  `,
        ].join('\n');
      },
    };
    lines.push(doers[instruction]());
    return lines;
  }, []).join('\n');
  fs.writeFileSync(`${folderPath}${filename}`, `${fileContent}\n`);
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
      name: 'privateNpm',
      message: 'Make it private from NPM? (Will not publish to NPM).  (default "no")',
      default: () => {
        return 'no';
      },
    },
    {
      type: 'input',
      name: 'privateGithub',
      message: 'Make it private from Github? (Will not publish to Github).  (default "no")',
      default: () => {
        return 'no';
      },
    },
    {
      type: 'input',
      name: 'bundleForNode',
      message: 'Is this targeted for Node enviornment? (Affects bundling).  (default "no")',
      default: () => {
        return 'no';
      },
    },
  ]);
}

function validate(answers) {
  const useScope = answers.npmScope[0].toLowerCase() === 'y';

  const repoName = answers.repoName;
  const entryCase = caseUtlity.of(repoName);
  const validCase = entryCase === 'kebab' || entryCase === 'lower' || entryCase === 'camel';
  const casedFileName = caseUtlity.kebab(repoName);
  const casedFileNameWithScope = useScope ? `@${process.env.NPM_SCOPE}/${casedFileName}` : casedFileName;
  const casedSemiEncodedNameWithScope = useScope ? `@${process.env.NPM_SCOPE}${encodeURIComponent('/')}${casedFileName}` : casedFileName;
  const casedVariableName = caseUtlity.camel(repoName);

  const makeMsg = (exclamation, destination, name) => {
    return `${exclamation}!, ${destination}, ${name} is ${(exclamation === 'Bad' ? 'NOT ' : '')}available!`;
  };

  const isPrivateNpm = answers.privateNpm[0].toLowerCase() === 'y';
  const isPrivateGithub = answers.privateGithub[0].toLowerCase() === 'y';
  const bundleForNode = answers.bundleForNode[0].toLowerCase() === 'y';
  const folderPath = `${process.cwd()}/packages/${casedFileName}/`;
  const validations = [];

  validations.push(Promise.resolve(validCase).then(() => {
    console.info(
      `${validCase ? 'Good' : 'Bad'}, you used ${entryCase} case in naming. ${validCase ? 'Use camelCaser, lowercase, or kebab-case' : ''}`
    );
    if (!validCase) {
      return Promise.reject(`Use camelCase, lowercase, or kebab-case, not ${entryCase} case.`);
    }
    return validCase;
  }));


  validations.push(Promise.resolve(fs.existsSync(folderPath)).then((folderExists) => {
    const folderAvailable = !folderExists;
    console.info(folderAvailable ? makeMsg('Good', 'folder', casedFileName) : makeMsg('Bad', 'folder', casedFileName));
    if (!folderAvailable) {
      return Promise.reject(`Folder already exists: packages/${casedFileName}`);
    }
    return folderAvailable;
  }));
  if (!isPrivateNpm) {
    validations.push(
      exec(`curl https://registry.npmjs.org/${casedSemiEncodedNameWithScope}/`).then(({ stdout }) => {
        const npmAvailable = !JSON.parse(stdout).name;
        console.info(npmAvailable ? makeMsg('Good', 'NPM', casedFileNameWithScope) : makeMsg('Bad', 'NPM', casedFileNameWithScope));
        if (!npmAvailable) {
          return Promise.reject(new Error(`NPM already exists: ${casedFileNameWithScope}`));
        }
        return npmAvailable;
      })
    );
  }
  if (!isPrivateGithub) {
    validations.push(
      exec(`curl -s -o /dev/null -w "%{http_code}" https://github.com/${process.env.NPM_SCOPE}/${casedFileName}/`).then(({ stdout }) => {
        const repoAvailable = stdout !== '200';
        console.info(repoAvailable ? makeMsg('Good', 'Github', casedFileName) : makeMsg('Bad', 'Github', casedFileName));
        if (!repoAvailable) {
          return Promise.reject(new Error(`Github project already exists: ${casedFileName}`));
        }
        return repoAvailable;
      })
    );
  }
  return Promise.all(validations).then(() => {
    console.log('ALLL GOOOOD');
    return {
      useScope,
      isPrivateNpm,
      isPrivateGithub,
      nameWithScope: casedFileNameWithScope,
      casedFileName,
      repoName,
      folderPath,
      casedVariableName,
      bundleForNode,
    };
  });
}

function boilerplateFolder(details) {
  console.log(details.folderPath);
  fs.mkdirSync(details.folderPath);

  const packageDotJsonContent = generatePackageDotJsonContent({
    name: details.nameWithScope,
    isPrivate: details.isPrivateNpm,
    isPrivateFromGithub: details.isPrivateGithub,
    bundleForNode: details.bundleForNode,
  });
  fs.writeJsonSync(`${details.folderPath}package.json`, packageDotJsonContent, { spaces: 2 });

  makeJsFile(Object.assign({
    flavor: null,
    instructions: ['noConsole', 'preferTemplate', 'simpleLog', 'export'],
  }, details));

  makeJsFile(Object.assign({
    flavor: 'demo',
    instructions: ['noConsole', 'preferTemplate', 'import', 'importLog', 'complexLog'],
  }, details));

  makeJsFile(Object.assign({
    flavor: 'test',
    instructions: ['noUndef', 'noConsole', 'preferTemplate', 'import', 'importLog', 'test'],
  }, details));

  makeJsFile(Object.assign({
    flavor: null,
    instructions: ['readme'],
    overrideFilename: 'README',
    extension: 'md'
  }, details));
}


module.exports = () => {
  survey()
  .then(validate)
  .then(boilerplateFolder)
  .catch((r) => {
    console.log('\x1b[31m', 'INIT PACKAGE FAILED', r, '\x1b[0m');
  });
};
