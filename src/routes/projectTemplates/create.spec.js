/**
 * Tests for create.js
 */
import chai from 'chai';
import _ from 'lodash';
import request from 'supertest';

import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

describe('CREATE project template', () => {
  before(() => testUtil.clearDb()
    .then(() => models.ProjectType.bulkCreate([
      {
        key: 'generic',
        displayName: 'Generic',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        metadata: {},
        createdBy: 1,
        updatedBy: 1,
      },
    ]))
    .then(() => models.Form.create({
      key: 'test',
      config: {
        test: 'test1',
      },
      version: 1,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    }))
    .then(() => models.PlanConfig.create({
      key: 'test',
      config: {
        test: 'test1',
      },
      version: 1,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    }))
    .then(() => models.PriceConfig.create({
      key: 'test',
      config: {
        test: 'test1',
      },
      version: 1,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    })),
  );

  describe('POST /projects/metadata/projectTemplates', () => {
    const body = {
      param: {
        name: 'template 1',
        key: 'key 1',
        category: 'generic',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        disabled: true,
        hidden: true,
        scope: {
          scope1: {
            subScope1A: 1,
            subScope1B: 2,
          },
          scope2: [1, 2, 3],
        },
        phases: {
          phase1: {
            name: 'phase 1',
            details: {
              anyDetails: 'any details 1',
            },
            others: ['others 11', 'others 12'],
          },
          phase2: {
            name: 'phase 2',
            details: {
              anyDetails: 'any details 2',
            },
            others: ['others 21', 'others 22'],
          },
        },
      },
    };

    const newModelBody = {
      param: {
        name: 'template 1',
        key: 'key 1',
        category: 'generic',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        disabled: true,
        hidden: true,
        form: {
          key: 'test',
          version: 1,
        },
        priceConfig: {
          key: 'test',
        },
        planConfig: {
          key: 'test',
        },
      },
    };

    const bodyDefinedFormScope = _.cloneDeep(body);
    bodyDefinedFormScope.param.form = {
      scope1: {
        subScope1A: 1,
        subScope1B: 2,
      },
      scope2: [1, 2, 3],
    };
    const bodyMissingFormScope = _.cloneDeep(body);
    delete bodyMissingFormScope.param.scope;

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 422 if validations dont pass', (done) => {
      const invalidBody = {
        param: {
          scope: 'a',
          phases: 1,
        },
      };

      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project type is missing', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.type = null;
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project type does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.type = 'not_exist';
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.param.name);
          resJson.key.should.be.eql(body.param.key);
          resJson.category.should.be.eql(body.param.category);
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);
          resJson.scope.should.be.eql(body.param.scope);
          resJson.phases.should.be.eql(body.param.phases);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 201 with new model', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newModelBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(newModelBody.param.name);
          resJson.key.should.be.eql(newModelBody.param.key);
          resJson.category.should.be.eql(newModelBody.param.category);
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);
          should.not.exist(resJson.scope);
          should.not.exist(resJson.phase);
          resJson.form.should.be.eql(newModelBody.param.form);
          resJson.planConfig.should.be.eql(newModelBody.param.planConfig);
          resJson.priceConfig.should.be.eql(newModelBody.param.priceConfig);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });

    it('should return 422 if both scope and form are defined', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyDefinedFormScope)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if both scope and form are missing', (done) => {
      request(server)
        .post('/v4/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyMissingFormScope)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });
  });
});
