const shell = require('shelljs');
const yargs = require('yargs')
const fs = require('fs-extra')


const version = process.env.npm_package_version;
console.log(`Changing @solid/community-server references to ${version}`); // --> 1.0.0

// const yargv = yargs(process.argv.slice(2))
//     .usage('node ./pre-release.js [args]')
//     .option('tag', {
//         alias: 't',
//         description: 'A semver tag to apply to @solid/community-server references in config files and package.json',
//         type: 'string'
//     })
//     .help().argv;



const configs = shell.find('config/**/*.json');
configs.push('package.json');
configs.forEach((filePath,index) => {
    shell.sed('-i', /(@solid\/community-server\/)\^\d+\.\d+\.\d+/, `$1^${version}`, filePath)
})
