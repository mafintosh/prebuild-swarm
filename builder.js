#!/usr/bin/env node

const DHT = require('@hyperswarm/dht')
const os = require('os')
const fs = require('fs')
const path = require('path')
const tar = require('tar-fs')
const { spawnSync } = require('child_process')

const tmp = path.join(os.tmpdir(), 'prebuild-swarm-' + Date.now())
const key = process.argv[2]
const repo = process.argv[3]

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
  spawnSync('npm', ['install'], { stdio: 'inherit' })
  spawnSync('npm', ['run', 'prebuild'], { stdio: 'inherit' })
  deliver(path.join(tmpRepo, 'prebuilds'))
} else if (process.platform === 'linux') {
  spawnSync('npx', ['ubuntu-prebuild-container', repo], { stdio: 'inherit' })
  deliver(path.join(tmpRepo, 'prebuilds', repo, 'prebuilds'))
} else if (process.platform === 'win32') {
  spawnSync('git', ['clone', 'https://github.com/' + repo, tmpRepo], { stdio: 'inherit' })
  process.chdir(tmpRepo)
  spawnSync('npm', ['install'], { stdio: 'inherit' })
  spawnSync('npm', ['run', 'prebuild'], { stdio: 'inherit' })
  spawnSync('npm', ['run', 'prebuild-ia32'], { stdio: 'inherit' })
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
