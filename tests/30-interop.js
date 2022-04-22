/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const chai = require('chai');
const {implementations} = require('vc-api-test-suite-implementations');
const {ISOTimeStamp, getCredentialStatus, filterMap} = require('./helpers.js');
const {v4: uuidv4} = require('uuid');
const {validVc} = require('../credentials');
const {klona} = require('klona');

const should = chai.should();

const predicate = ({value}) =>
  value.issuers.some(issuer => issuer.tags.has('StatusList2021'));
// only use implementations that use `StatusList2021`
const filtered = filterMap({map: implementations, predicate});

describe('StatusList2021 Credentials (Interop)', function() {
  // column names for the matrix go here
  const columnNames = [];
  // this will tell the report
  // to make an interop matrix with this suite
  this.matrix = true;
  this.report = true;
  this.columns = columnNames;
  this.rowLabel = 'Test Name';
  this.columnLabel = 'Implementation';
  // the reportData will be displayed under the test title
  for(const [issuerName, {issuers}] of filtered) {
    let issuedVc;
    before(async function() {
      const issuer = issuers.find(issuer => issuer.tags.has('StatusList2021'));
      const expires = () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 2);
        return ISOTimeStamp({date});
      };
      const {issuer: {id: issuerId}} = issuer;
      const body = {
        credential: {
          ...validVc,
          id: `urn:uuid:${uuidv4()}`,
          issuanceDate: ISOTimeStamp(),
          expirationDate: expires(),
          issuer: issuerId
        }
      };
      const {result} = await issuer.issue({body});
      if(result) {
        issuedVc = result.data.verifiableCredential;
      }
    });
    // this sends a credential issued by the implementation
    // to each verifier
    for(const [verifierName, {verifiers}] of filtered) {
      columnNames.push(verifierName);
      const verifier = verifiers.find(verifier =>
        verifier.tags.has('StatusList2021'));
      it(`MUST successfully verify VC issued by ${issuerName}`,
        async function() {
          // this tells the test report which cell in the interop matrix
          // the result goes in
          this.test.cell = {columnId: verifierName, rowId: this.test.title};
          const body = {
            verifiableCredential: issuedVc,
            options: {
              checks: ['proof', 'credentialStatus']
            }
          };
          const {result, error} = await verifier.verify({body});
          should.exist(result);
          should.not.exist(error);
          // verifier returns 200
          result.status.should.equal(200);
          should.exist(result.data);
          // verifier responses vary but are all objects
          result.data.should.be.an('object');
          result.data.verified.should.equal(true);
          result.data.statusResult.verified.should.equal(true);
          result.data.checks.should.eql(['proof', 'credentialStatus']);
        });
      it(`MUST revoke a credential and fail to verify revoked credential`,
        async function() {
          // FIXME: Currently this test uses credential with 2020 status
          // type.

          // this tells the test report which cell in the interop matrix
          // the result goes in
          this.test.cell = {columnId: verifierName, rowId: this.test.title};
          // copy vc issued
          const vc = klona(issuedVc);
          // get the status of the VC
          const statusInfo = await getCredentialStatus(
            {verifiableCredential: vc});
          statusInfo.status.should.equal(false);

          // verification of the credential should pass
          const body = {
            verifiableCredential: vc,
            options: {
              checks: ['proof', 'credentialStatus']
            }
          };
          const {result: result1, error: err1} = await verifier.verify(
            {body});
          should.exist(result1);
          should.not.exist(err1);
          result1.status.should.equal(200);
          should.exist(result1.data);
          // verifier responses vary but are all objects
          result1.data.should.be.an('object');
          result1.data.verified.should.equal(true);
          result1.data.statusResult.verified.should.equal(true);

          const issuer = issuers.find(issuer =>
            issuer.tags.has('StatusList2021'));
          const body2 = {
            credentialId: vc.id,
            credentialStatus: {
              type: 'RevocationList2020Status'
            }
          };
            // Then revoke the VC
          const {result: result2, error: err2} = await issuer.setStatus(
            {body: body2});
          should.not.exist(err2);
          should.exist(result2);
          result2.status.should.equal(200);
          const publishSlcEndpoint =
              `${statusInfo.statusListCredential}/publish`;
            // force publication of new SLC
          const {result: result3, error: err3} = await issuer.publishSlc(
            {endpoint: publishSlcEndpoint, body: {}});
          should.not.exist(err3);
          should.exist(result3);
          result3.status.should.equal(204);

          // get the status of the VC
          const {status} = await getCredentialStatus(
            {verifiableCredential: vc});
          status.should.equal(true);

          // try to verify the credential again, should fail since it
          // has been revoked
          const body3 = {
            verifiableCredential: vc,
            options: {
              checks: ['proof', 'credentialStatus']
            }
          };
          const {result: result4, error: err4} = await verifier.verify(
            {body: body3});
          should.not.exist(result4);
          should.exist(err4);
          should.exist(err4.data);
          // verifier returns 400
          err4.status.should.equal(400);
          err4.data.verified.should.equal(false);
        });
    }
  }
});