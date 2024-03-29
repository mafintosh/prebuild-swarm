#!/usr/bin/env node

const DHT = require('hyperdht')
const os = require('os')
const fs = require('fs')
const path = require('path')
const tar = require('tar-fs')
const { spawnSync } = require('child_process')

const tmp = path.join(os.tmpdir(), 'prebuild-swarm-' + Date.now())
const key = process.argv[2]
const repo = process.argv[3]
const musl = process.argv.includes('--musl') ? ['--musl'] : []

const tmpRepo = path.join(tmp, 'repo')

if (!repo) {
  console.log('Usage: prebuild-swarm-builder [public-key] [user/repo]')
  process.exit(1)
}

try {
  fs.rmSync(tmp, { recursive: true })
} catch {
  // ignore
}

try {
  fs.mkdirSync(tmp)
} catch {
  // ignore
}

process.chdir(tmp)

if (process.platform === 'darwin') {
  spawnSync('git', ['clone', 'https://github.com/' + repo, tmpRepo], { stdio: 'inherit' })
  process.chdir(tmpRepo)
  if (fs.existsSync('.gitmodules')) {
    spawnSync('git' ,['config', '--local', 'url.https://github.com/.insteadOf', 'ssh://git@github.com:'], { stdio: 'inherit' })
    spawnSync('git', ['submodule', 'update', '--init', '--recursive'], { stdio: 'inherit' })
  }
  spawnSync('npm', ['install'], { stdio: 'inherit' })
  spawnSync('npm', ['run', 'prebuild'], { stdio: 'inherit' })
  deliver(path.join(tmpRepo, 'prebuilds'))
} else if (process.platform === 'linux') {
  spawnSync('npx', ['ubuntu-prebuild-container', repo].concat(musl), { stdio: 'inherit' })
  deliver(path.join(tmp, 'prebuilds', repo, 'prebuilds'))
} else if (process.platform === 'win32') {
  spawnSync('git', ['clone', 'https://github.com/' + repo, tmpRepo], { stdio: 'inherit' })
  process.chdir(tmpRepo)
  if (fs.existsSync('.gitmodules')) {
    spawnSync('git' ,['config', '--local', 'url.https://github.com/.insteadOf', 'ssh://git@github.com:'], { stdio: 'inherit' })
    spawnSync('git', ['submodule', 'update', '--init', '--recursive'], { stdio: 'inherit' })
  }
  const pkg = require(path.join(tmpRepo, 'package.json'))
  spawnSync('npm.cmd', ['install'], { stdio: 'inherit' })
  spawnSync('npm.cmd', ['run', 'prebuild'], { stdio: 'inherit' })
  if (pkg.scripts && pkg.scripts['prebuild-ia32']) spawnSync('npm.cmd', ['run', 'prebuild-ia32'], { stdio: 'inherit' })
  deliver(path.join(tmpRepo, 'prebuilds'))
} else {
  console.log('Unknown platform:', process.platform)
  process.exit(1)
}

function deliver (folder) {
  const node = new DHT()
  const socket = node.connect(Buffer.from(key, 'hex'))

  tar.pack(folder).pipe(socket)
  socket.resume()
  socket.on('close', function () {
    console.log('Prebuilds delivered, exiting')
    process.exit(0)
  })
}
