const replace = require('replace-in-file');

const options = {
    files: 'CHANGELOG.md',
    from: /### \[/g,
    to: '## ['
}

try{
    replace.sync(options);
}
catch (error) {
    console.error(error)
}