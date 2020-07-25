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
      mvn
```

## Ensure Environment Variables
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    ensure-env: |
      M2_HOME
      GRADLE_HOME
```

## Tag Release
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    tag-release-username: 'Whoami'
    tag-release-useremail: 'whoami@example.org'
    tag-release-branch: 0.0.0
    tag-release-tag: 0.0.0
    tag-release-tag-prefix: v
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
