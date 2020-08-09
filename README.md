# build-zoo-handler

<p align="left">
  <a href="https://github.com/jvalkeal/build-zoo-handler"><img alt="GitHub Actions status" src="https://github.com/jvalkeal/build-zoo-handler/workflows/Main%20workflow/badge.svg"></a>
</p>

This action by itself and without a proper configuration does nothing.
Provides these features which are described more detailed in a rest
of a documentation.

- Ensure env variables to fail fast.
- Ensure commands in a path to fail fast.
- Setup buildpacks.io pack client.
- Easy way to commit changes back to repository.
- Opinionated way to branch and tag changes.
- Central repository dispatch system for "release train".

NOTE: Please do not use `main` as version as it is a just a development
      version and can contain breaking changes and be unstable. Also
      check related documentation from a tag to know what is in that
      particular version as README and docs content in `main` always
      reflect main dev state.

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
See [docs/ensure-commands.adoc](docs/ensure-commands.adoc)

## Ensure Environment Variables
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    ensure-env: |
      M2_HOME
      GRADLE_HOME
```
See [docs/ensure-env.adoc](docs/ensure-env.adoc)

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
See [docs/tag-release.adoc](docs/tag-release.adoc)

## Commit Changes
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    commit-changes-username: 'Whoami'
    commit-changes-useremail: 'whoami@example.org'
    commit-changes-branch: main
    commit-changes-message: Commit message
```
See [docs/commit-changes.adoc](docs/commit-changes.adoc)

## Pack Feature
```yaml
steps:
- uses: jvalkeal/build-zoo-handler@main
  with:
    pack-version: 0.12.0
```
See [docs/pack.adoc](docs/pack.adoc)

## Workflow Dispatch Handler
This feature is meant to run a _release train_ throughout a list of workflow
dispatch definitions.

See [docs/dispatch-handler.adoc](docs/dispatch-handler.adoc)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
