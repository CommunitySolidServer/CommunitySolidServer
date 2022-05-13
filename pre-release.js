const fs = require('fs-extra');
const simpleGit = require('simple-git');
const { fdir } = require("fdir");

const major = process.env.npm_package_version.split('.')[0]

async function replaceVersion(filePath){
    fs.readFile(filePath, 'utf8', function(err,data) {
        if (err) {
            return process.stderr.write(`${err}\n`)
        }
        var result = data.replace(/(@solid\/community-server\/)\^\d+\.\d+\.\d+/gm, `$1^${major}.0.0`);

        fs.writeFile(filePath, result, 'utf8', function (err) {
            if (err) return process.stderr.write(`${err}\n`);
        });
    })
}

async function upgradeConfig(){
    process.stdout.write(`Changing @solid/community-server references to ${major}.0.0\n`)
    
    const configs = await new fdir().withBasePath()
        .filter((path, isDirectory) => path.endsWith(".json"))
        .crawl('config')
        .withPromise();
    
    for(let index = 0; index < configs.length; index++){
        await replaceVersion(configs[index]);
    }
    await replaceVersion('package-lock.json');

    return await simpleGit().commit(`chore: Update configs to v${major}.0.0`, configs, {'--no-verify': undefined});
}

upgradeConfig()
    .then(() => process.stdout.write(`Configs upgraded and committed\n`))
    .catch(error => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
    });