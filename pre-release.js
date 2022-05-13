const shell = require('shelljs');
const simpleGit = require('simple-git');

const major = process.env.npm_package_version.split('.')[0]
console.log(`Changing @solid/community-server references to ${major}.0.0`)

const configs = shell.find('config/**/*.json');
configs.push('package.json');
configs.forEach((filePath,index) => {
    shell.sed('-i', /(@solid\/community-server\/)\^\d+\.\d+\.\d+/, `$1^${major}.0.0`, filePath)
});

const git = simpleGit();
git.add(configs);
git.commit(`chore: Update configs to v${major}.0.0`);