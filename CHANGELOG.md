# Changelog

All notable changes to this project are documented in this file. Versioning and this changelog are
managed automatically by [release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.1](https://github.com/emilyeserven/TripTap/compare/v0.1.0...v0.1.1) (2026-06-25)


### Features

* **client:** replace top nav with collapsible shadcn sidebar ([#6](https://github.com/emilyeserven/TripTap/issues/6)) ([feaf7e3](https://github.com/emilyeserven/TripTap/commit/feaf7e32beed9fac09d6552ef882449d68f2b9fb))


### Bug Fixes

* change gateway expose port from 3001 to 3000 ([#4](https://github.com/emilyeserven/TripTap/issues/4)) ([3bb5ffa](https://github.com/emilyeserven/TripTap/commit/3bb5ffade070570f27403a31bd5870e007244bcb))
* change gateway port from 3000 to 3001 ([#2](https://github.com/emilyeserven/TripTap/issues/2)) ([9f51348](https://github.com/emilyeserven/TripTap/commit/9f51348fa4d42e85fdef90fd71eaa763e8d02059))

## 0.1.0

- Initial scaffold: pnpm monorepo (`types`, `middleware`, `client`, `gateway`) with a Trips
  vertical slice, Docker/Postgres, GitHub Actions CI, Husky + commitlint, and Fallow audits.
