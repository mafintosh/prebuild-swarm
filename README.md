# prebuild-swarm

Easily make distributed prebuilds with Hyperswarm

```
npm install -g prebuild-swarm
```

On the machine receiving all builds

```
prebuild-swarm-receiver
```

That prints a command to run on machines you want to produce prebuilds on, something similar to

```
prebuild-swarm-builder <public-key> <user/repo>
```

## License

MIT
