# build-zoo-handler

<p align="left">
  <a href="https://github.com/jvalkeal/build-zoo-handler"><img alt="GitHub Actions status" src="https://github.com/jvalkeal/build-zoo-handler/workflows/Main%20workflow/badge.svg"></a>
</p>

This action by itself and without a proper configuration does nothing.

- Setup commands which needs to exist to fails fast.

# Usage

See [action.yml](action.yml)

## Ensure Commands in a Path
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    ensure-commands: |
      gradle
      maven
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
