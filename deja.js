#!/usr/bin/env node
var fs = require('fs'),
  deja = require('./lib/deja')
  argv = require('optimist').argv

var home = process.env.HOME

// if HOME not set, die
if (home == undefined) {
  console.log('Error: HOME environmental variable not defined.')
  process.exit(1)
}

var dejaHome = home + '/.deja'

// make sure .deja exists in home directory
try {
  fs.mkdirSync(dejaHome, 0700)
} catch(e) {}

// deal with command line input
if (argv['_'].length < 1 || argv['_'].length > 2) {

  invalid_command() 
}
else if(argv['_'].length == 2) {

  var command = argv['_'][0]
  var param   = argv['_'][1]

  switch(command) {

    // clone a repo and create symlinks
    case 'clone':
      deja.cloneRepo(home, dejaHome, param)
      break

    // update repo
    case 'pull':
      deja.pullRepo(dejaHome, param)
      break

    // show differences between repo and home dir
    case 'diff':
      deja.diffRepo(home, dejaHome, param)
      break

    // delete repo
    case 'rm':
      deja.rmRepo(home, dejaHome, param)
      break

    // add home dir symlinks to repo
    case 'link':
      deja.rmLink(home, dejaHome, param)
      break

    // list repo contents
    case 'ls':
      deja.ls(dejaHome + '/' + param)
      break

    default:
      invalid_command()
  }
}
else {

  var command = argv['_'][0]

  switch(command) {

    // list repos
    case 'ls':
      deja.ls(dejaHome)
      break

    // output help
    case 'help':
      console.log(deja.usage())
      break

    default:
      invalid_command()
  }
}

function invalid_command() {
  console.log('Unrecognized command.')

  console.log(deja.usage())
  process.exit(1)
}
