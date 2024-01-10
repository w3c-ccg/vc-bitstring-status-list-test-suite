/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {
  createRequestBody, getCredentialStatus, issueVc, updateStatus
} from './helpers.js';
import {filterByTag, filterImplementations} from
  'vc-test-suite-implementations';
import {shouldFailVerification, shouldPassVerification} from './assertions.js';
import {klona} from 'klona';

// only use implementations with `BitstringStatusList` verifiers.
const {match} = filterByTag({
  property: 'verifiers',
  tags: ['BitstringStatusList']
});

describe('BitstringStatusList Credentials (Verify)', function() {
  this.matrix = true;
  this.report = true;
  this.implemented = [...match.keys()];
  this.rowLabel = 'Test Name';
  this.columnLabel = 'Verifier';
  for(const [verifierName, {verifiers}] of match) {
    describe(verifierName, function() {
      const verifier = verifiers.find(verifier =>
        verifier.tags.has('BitstringStatusList'));
      let validVcForRevocation;
      let validVcForSuspension;
      let setRevocationStatusList;
      let setSuspensionStatusList;
      let publishRevocationStatusList;
      let publishSuspensionStatusList;
      before(async function() {
        // get a VC issued by DB
        const {match} = filterImplementations({filter: ({value}) => {
          // FIXME: Make issuer name configurable via env variable
          return value.settings.name === 'Digital Bazaar';
        }});
        const res = match.get('Digital Bazaar');
        const {issuers, setStatusLists, publishStatusLists} = res;
        setRevocationStatusList = setStatusLists.find(
          issuer => issuer.tags.has('Revocation'));
        setSuspensionStatusList = setStatusLists.find(
          issuer => issuer.tags.has('Suspension'));
        publishRevocationStatusList = publishStatusLists.find(
          issuer => issuer.tags.has('Revocation'));
        publishSuspensionStatusList = publishStatusLists.find(
          issuer => issuer.tags.has('Suspension'));
        const issuer1 = issuers.find(issuer => issuer.tags.has('Revocation'));
        const {data: data1} = await issueVc({issuer: issuer1});
        validVcForRevocation = data1;
        const issuer2 = issuers.find(issuer => issuer.tags.has('Suspension'));
        const {data: data2} = await issueVc({issuer: issuer2});
        validVcForSuspension = data2;
      });
      it('MUST verify a valid "BitstringStatusListCredential" with ' +
        '"revocation" status purpose', async function() {
        this.test.cell = {columnId: verifierName, rowId: this.test.title};
        const {result, error, statusCode} = await verifier.post({
          json: createRequestBody({vc: validVcForRevocation})
        });
        shouldPassVerification({result, error, statusCode});
      });
      it('MUST verify a valid "BitstringStatusListCredential" with ' +
        '"suspension" status purpose', async function() {
        this.test.cell = {columnId: verifierName, rowId: this.test.title};
        const {result, error, statusCode} = await verifier.post({
          json: createRequestBody({vc: validVcForSuspension})
        });
        shouldPassVerification({result, error, statusCode});
      });
      it('MUST fail to verify a VC with invalid ' +
        '"credentialStatus.statusListCredential"', async function() {
        this.test.cell = {columnId: verifierName, rowId: this.test.title};
        const invalidStatusListCredential = klona(validVcForRevocation);
        invalidStatusListCredential.credentialStatus.statusListCredential =
          'invalid-statusListCredential';
        const {result, error, statusCode} = await verifier.post({
          json: createRequestBody({vc: invalidStatusListCredential})
        });
        shouldFailVerification({result, error, statusCode});
      });
      it('MUST fail to verify a VC with invalid "credentialStatus.type"',
        async function() {
          this.test.cell = {columnId: verifierName, rowId: this.test.title};
          const invalidCredentialStatusType = klona(validVcForRevocation);
          invalidCredentialStatusType.credentialStatus.type = 'invalid-type';
          const {result, error, statusCode} = await verifier.post({
            json: createRequestBody({vc: invalidCredentialStatusType})
          });
          shouldFailVerification({result, error, statusCode});
        });
      it('MUST fail to verify a revoked status list credential',
        async function() {
          this.test.cell = {columnId: verifierName, rowId: this.test.title};
          // get the status of the VC
          const statusInfo = await getCredentialStatus({
            verifiableCredential: validVcForRevocation
          });
          statusInfo.status.should.equal(false);
          // verification of the credential should pass
          const {result, error, statusCode} = await verifier.post({
            json: createRequestBody({vc: validVcForRevocation})
          });
          shouldPassVerification({result, error, statusCode});
          // update the status of the VC and revoke it
          const revokedVc = await updateStatus({
            vc: validVcForRevocation, setStatusList: setRevocationStatusList,
            publishStatusList: publishRevocationStatusList, statusInfo,
            statusPurpose: 'revocation'
          });
          // try to verify the credential after revocation, should fail since it
          // has now been revoked
          const {
            result: result2, error: err2, statusCode: statusCode2
          } = await verifier.post({
            json: createRequestBody({vc: revokedVc})
          });
          shouldFailVerification({
            result: result2, error: err2, statusCode: statusCode2
          });
        });
      it('MUST fail to verify a suspended status list credential',
        async function() {
          this.test.cell = {columnId: verifierName, rowId: this.test.title};
          // get the status of the VC
          const statusInfo = await getCredentialStatus({
            verifiableCredential: validVcForSuspension
          });
          statusInfo.status.should.equal(false);
          // verification of the credential should pass
          const {result, error, statusCode} = await verifier.post({
            json: createRequestBody({vc: validVcForSuspension})
          });
          shouldPassVerification({result, error, statusCode});
          // update the status of the VC and suspend it
          const suspendedVc = await updateStatus({
            vc: validVcForSuspension, setStatusList: setSuspensionStatusList,
            publishStatusList: publishSuspensionStatusList, statusInfo,
            statusPurpose: 'suspension'
          });
          // try to verify the credential after suspension, should fail since it
          // has now been suspended
          const {
            result: result2, error: err2, statusCode: statusCode2
          } = await verifier.post({
            json: createRequestBody({vc: suspendedVc})
          });
          shouldFailVerification({
            result: result2, error: err2, statusCode: statusCode2
          });
        });
    });
  }
});
