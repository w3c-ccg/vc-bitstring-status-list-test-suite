/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {createRequestBody, issueVc} from './helpers.js';
import chai from 'chai';
import {endpoints} from 'vc-test-suite-implementations';
import {shouldPassVerification} from './assertions.js';

const should = chai.should();

// only use implementations with `BitstringStatusList` tags.
const {match: issuerMatches} = endpoints.filterByTag({
  property: 'issuers',
  tags: ['BitstringStatusList']
});

const {match: verifierMatches} = endpoints.filterByTag({
  property: 'verifiers',
  tags: ['BitstringStatusList']
});

describe('BitstringStatusList Credentials (Interop "statusPurpose: ' +
  'revocation")', function() {
  // this will tell the report
  // to make an interop matrix with this suite
  this.matrix = true;
  this.report = true;
  this.implemented = [...verifierMatches.keys()];
  this.rowLabel = 'Issuer';
  this.columnLabel = 'Verifier';
  for(const [issuerName, {endpoints}] of issuerMatches) {
    let issuedVc;
    before(async function() {
      const [issuer] = endpoints.filter(
        endpoint => endpoint.settings.tags.includes('Revocation'));
      issuedVc = issueVc({issuer});
    });
    for(const [verifierName, {endpoints}] of verifierMatches) {
      const [verifier] = endpoints;
      it(`${verifierName} should verify ${issuerName}`, async function() {
        this.test.cell = {rowId: issuerName, columnId: verifierName};
        const {data: vc, error: err} = await issuedVc;
        should.not.exist(err);
        should.exist(vc);
        const body = createRequestBody({vc});
        const {result, error, statusCode} = await verifier.post({json: body});
        shouldPassVerification({result, error, statusCode});
      });
    }
  }
});

describe('BitstringStatusList Credentials (Interop "statusPurpose: ' +
  'suspension")', function() {
  // this will tell the report
  // to make an interop matrix with this suite
  this.matrix = true;
  this.report = true;
  this.implemented = [...verifierMatches.keys()];
  this.rowLabel = 'Issuer';
  this.columnLabel = 'Verifier';
  for(const [issuerName, {endpoints}] of issuerMatches) {
    let issuedVc;
    before(async function() {
      const [issuer] = endpoints.filter(
        endpoint => endpoint.settings.tags.includes('Suspension'));
      issuedVc = issueVc({issuer});
    });
    for(const [verifierName, {endpoints}] of verifierMatches) {
      const [verifier] = endpoints;
      it(`${verifierName} should verify ${issuerName}`, async function() {
        this.test.cell = {rowId: issuerName, columnId: verifierName};
        const {data: vc, error: err} = await issuedVc;
        should.not.exist(err);
        should.exist(vc);
        const body = createRequestBody({vc});
        const {result, error, statusCode} = await verifier.post({json: body});
        shouldPassVerification({result, error, statusCode});
      });
    }
  }
});
