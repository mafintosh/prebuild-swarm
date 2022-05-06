#!/usr/bin/env node

const DHT = require('@hyperswarm/dht')
const tar = require('tar-fs')
const { spawnSync } = require('child_process')

const node = new DHT()
const server = node.createServer(function (socket) {
  console.log('Receiving builds')

  const e = tar.extract('./prebuilds', {
    map (header) {
      console.log('Extracting builds:', header.name)
      return header
    }
  }).on('error', function (err) {
    console.log('Build extraction failed:', err)
  }).on('finish', function () {
    console.log('Build extraction complete')
    socket.end()
  })

  socket.pipe(e)
  socket.on('error', () => socket.destroy())
  socket.on('close', function () {
    e.destroy()
  })
})

server.listen().then(function () {
  console.log('Receiver started. Run the following on build machines:')
  console.log()
  console.log('prebuild-swarm-builder ' + server.address().publicKey.toString('hex') + ' ' + repo())
  console.log()
})

function repo () {
  for (const line of spawnSync('git', ['remote', '-v']).stdout.toString().split('\n')) {
    if (line.indexOf('origin') === -1) continue
    const repo = line.match(/[:/]([^/]+\/\S+)/)
    if (!repo) continue
    return repo[1].replace(/\.git$/, '')
  }

  return '<user/repo>'
}
