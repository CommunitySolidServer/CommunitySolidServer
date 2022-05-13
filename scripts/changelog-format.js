const fs = require('fs-extra');

async function replaceInFile(from, to, filePath){
    const data = await fs.readFile(filePath, 'utf8');
    const result = data.replace(from, to);
    return fs.writeFile(filePath, result, 'utf8');
}

replaceInFile(/### \[/g, '## [', 'CHANGELOG.md')
    .then(console.log("CHANGELOG.md formatted"))
    .catch(error => console.error(error))
