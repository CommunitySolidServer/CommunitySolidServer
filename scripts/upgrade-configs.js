const fs = require('fs-extra');
const simpleGit = require('simple-git');
const { fdir } = require("fdir");

const major = process.env.npm_package_version.split('.')[0]

async function replaceVersion(filePath){
    const data = await fs.readFile(filePath, 'utf8');
    const result = data.replace(/(@solid\/community-server\/)\^\d+\.\d+\.\d+/gm, `$1^${major}.0.0`);
    return fs.writeFile(filePath, result, 'utf8');
}

async function upgradeConfig(){
    console.log(`Changing @solid/community-server references to ${major}.0.0\n`)
    
    const configs = await new fdir().withBasePath()
        .filter((path, isDirectory) => path.endsWith(".json"))
        .crawl('config')
        .withPromise();

    for(let index = 0; index < configs.length; index++){
        await replaceVersion(configs[index]);
    }
    await replaceVersion('package.json');

    return simpleGit().commit(`chore: Update configs to v${major}.0.0`, configs, {'--no-verify': undefined});
}

upgradeConfig()
    .then(() => console.log(`Configs upgraded and committed\n`))
    .catch(error => {
    console.error(`${error.stack}`);
    });