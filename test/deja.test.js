var assert = require('assert')
  , should = require('should')
  , spawn = require('child_process').spawn
  , fs = require('fs')
  , path = require('path')

TESTING_DIR = '/tmp/dejaTest'

function testing_setup(testingDir, callback) {

  // if temp dir exists, delete contents
  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      var rm = spawn('rm', ['-r', '-f', testingDir])

      rm.on('exit', function(code) {

        makeTestDirectory(testingDir, callback)
      })
    }
    else {

      makeTestDirectory(testingDir, callback)
    }
  })
}

function makeTestDirectory(testingDir, callback) {

  // make testing directory
  fs.mkdirSync(testingDir, 0777)

  // if testing directory doesn't now exit, abort testing
  path.exists(testingDir, function(exists) {

    if (!exists) {
      console.log('Error: could not create testing directory.')
      error(1)
    }
    else {
      callback()
    }
  })
}

function testing_teardown(testingDir, callback) {

  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      var rm = spawn('rm', ['-r', '-f', testingDir])

      rm.on('exit', function(code) {
        if (callback) {
          callback()
        }
      })
    }
    else {
      if (callback) {
        callback()
      }
    }
  })
}

function spawnInTestHome(command, args, testingDir) {

  process.env.HOME = testingDir
  return spawn(command, args, {env: process.env})
}

function doClone(testingDir, repoBaseName, repoUrl, exists_callback) {

  var dejaArgs = ['clone', repoUrl]
  var deja = spawnInTestHome('deja', dejaArgs, testingDir)
  deja.on('exit', function(code) {
    path.exists(testingDir + '/.deja/' + repoBaseName + '/.git', exists_callback)
  })
}

function doMockClone(testingDir, repoBaseName, exists_callback) {

  var pathToDeja = testingDir + '/.deja'

  // make deja directory
  fs.mkdirSync(pathToDeja, 0777)

  path.exists(pathToDeja, function(exists) {
    exists.should.equal(true)

    var pathToMockRepo = pathToDeja + '/' + repoBaseName

    // make mock repo directory
    fs.mkdirSync(pathToMockRepo, 0777)

    path.exists(pathToMockRepo, function(exists) {
      exists.should.equal(true)

      var pathToMockGitDir = pathToMockRepo + '/.git'

      // stick fake .git dir in fake repo
      fs.mkdirSync(pathToMockGitDir, 0777)

      path.exists(pathToMockGitDir, function(exists) {
        exists.should.equal(true)

        var pathToFakeVimrc = pathToMockRepo + '/.vimrc'
        var touch = spawn('touch', [pathToFakeVimrc])

        touch.on('exit', function(code) {
          path.exists(pathToFakeVimrc, exists_callback)
        })
      })
    })
  })
}

function testCloneThenTeardown(testingDir, repoBaseName, repoUrl) {

  doClone(testingDir, repoBaseName, repoUrl, function(exists) {
    exists.should.equal(true)
    testing_teardown(testingDir)
  })
}

module.exports = {
  'test .deja dir creation': function() {
    var testingDir = TESTING_DIR + '_a'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        var deja = spawnInTestHome('deja', ['help'], testingDir)
        deja.on('exit', function(code) {
          code.should.equal(0)
          if (code == 0) {
            path.exists(testingDir + '/.deja', function(exists) {
              exists.should.equal(true)
              testing_teardown(testingDir)
            })
          }
        })
      })
    })
  },

  'test deja clone': function() {
    var testingDir = TESTING_DIR + '_b'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        testCloneThenTeardown(testingDir, 'dotfiles', 'git://github.com/mcantelon/dotfiles.git')
      })
    })
  },

  'test deja clone with shortform': function() {
    var testingDir = TESTING_DIR + '_c'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        testCloneThenTeardown(testingDir, 'dotfiles', 'mcantelon/dotfiles')
      })
    })
  },

  'test deja rm': function() {
    var testingDir = TESTING_DIR + '_d'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        doMockClone(testingDir, 'dotfiles', function(exists) {
          exists.should.equal(true)
          if (exists) {
            var deja = spawnInTestHome('deja', ['rm', 'dotfiles'], testingDir)
            deja.on('exit', function(code) {
              path.exists(testingDir + '/.deja/dotfiles', function(exists) {
                // the repo should have been deleted by "deja rm dotfiles"
                exists.should.equal(false)
                testing_teardown(testingDir)
              })
            })
          }
       })
     })
    })
  },

  'test deja ls': function() {
    var testingDir = TESTING_DIR + '_e'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        doMockClone(testingDir, 'dotfiles', function(exists) {
          exists.should.equal(true)
          if (exists) {
            var deja = spawnInTestHome('deja', ['ls'], testingDir)
            deja.stdout.on('data', function(data) {
              data.toString().should.equal("dotfiles\n")
             testing_teardown(testingDir)
            })
         }
       })
      })
    })
  },

  'test deja link': function() {
    var testingDir = TESTING_DIR + '_f'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        doMockClone(testingDir, 'dotfiles', function(exists) {
          exists.should.equal(true)
          if (exists) {
            var deja = spawnInTestHome('deja', ['link', 'dotfiles'], testingDir)
            deja.on('exit', function(code) {
              code.should.equal(0)
              fs.lstat(testingDir + '/.vimrc', function(err, stats) {
                stats.isSymbolicLink().should.equal(true)
                testing_teardown(testingDir)
              })
            })
          }
        })
      })
    })
  },

  'test deja unlink': function() {
    var testingDir = TESTING_DIR + '_g'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        doMockClone(testingDir, 'dotfiles', function(exists) {
          exists.should.equal(true)
          if (exists) {
            var deja = spawnInTestHome('deja', ['link', 'dotfiles'], testingDir)
            deja.on('exit', function(code) {
              code.should.equal(0)
              fs.lstat(testingDir + '/.vimrc', function(err, stats) {
                stats.isSymbolicLink().should.equal(true)

                var deja = spawnInTestHome('deja', ['unlink', 'dotfiles'], testingDir)
                deja.on('exit', function(code) {
                  code.should.equal(0)

                  fs.lstat(testingDir + '/.vimrc', function(err, stats) {
                    assert.isUndefined(stats)
                    testing_teardown(testingDir)
                  })
                })
              })
            })
          }
        })
      })
    })
  },

  'test deja duplicate repo name handling': function() {
    var repoUrl = 'mcantelon/dotfiles'
    var testingDir = TESTING_DIR + '_h'
    testing_teardown(testingDir, function() {
      testing_setup(testingDir, function() {
        doClone(testingDir, 'dotfiles', repoUrl, function(exists) {
          exists.should.equal(true)
          if (exists) {
            var dejaArgs = ['clone', repoUrl]
            var deja = spawnInTestHome('deja', dejaArgs, testingDir)
            deja.on('exit', function(code) {
              // deja should have padding the repo name as it's a duplicate
              path.exists(testingDir + '/.deja/dotfiles_1/.git', function(exists) {
                exists.should.equal(true)
                testing_teardown(testingDir)
             })
            })
          }
        })
      })
    })
  }
}
