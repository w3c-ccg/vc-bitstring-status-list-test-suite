# VC Bitstring Status List Interoperability Test Suite

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Generator](#generator)
- [Implementation](#implementation)

## Background

Provides interoperability tests for issuers and verifiers that support
[VC Bitstring Status List](https://w3c.github.io/vc-bitstring-status-list/).

## Install

```js
npm i
```

## Usage

```
npm test
```

## Generator

To generate new test data use this command:

```js
npm run generate-vcs
```

## Implementation

To add your implementation to this test suite see the
`w3c-ccg/vc-test-suite-implementations` [README](https://github.com/w3c-ccg/vc-test-suite-implementations/blob/main/README.md). Add the tags
`BitstringStatusList` along with `Revocation` or `Suspension` to run your
issuer and verifier against this test suite.

Note: To run the tests, some implementations require client secrets that can be
passed as env variables to the test script. To see which ones require client
secrets, you can check configs in the `w3c-ccg/vc-test-suite-implementations`
repo.
