/**
 * Tests for update.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE work management permission', () => {
  let permissionId;
  let templateId;

  let permission = {
    policy: 'work.create',
    permission: {
      allowRule: {
        projectRoles: ['customer', 'copilot'],
        topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
      },
      denyRule: { projectRoles: ['copilot'] },
    },
    createdBy: 1,
    updatedBy: 1,
  };

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.create({
          name: 'template 2',
          key: 'key 2',
          category: 'category 2',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          scope: {},
          phases: {},
          createdBy: 1,
          updatedBy: 2,
        })
        .then((t) => {
          templateId = t.id;
          permission = _.assign({}, permission, { projectTemplateId: templateId });
          models.WorkManagementPermission.create(permission)
          .then((p) => {
            permissionId = p.id;
          })
          .then(() => done());
        });
      });
  });

  after(testUtil.clearDb);

  describe('PATCH /projects/metadata/workManagementPermission/{permissionId}', () => {
    const body = {
      param: {
        policy: 'work.edit',
        permission: {
          allowRule: {
            projectRoles: ['customer', 'copilot'],
            topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
          },
          denyRule: { projectRoles: ['copilot'] },
        },
        createdBy: 1,
        updatedBy: 1,
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 403 for non-member', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 404 for non-existed type', (done) => {
      request(server)
        .patch('/v4/projects/metadata/workManagementPermission/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.WorkManagementPermission.destroy({ where: { id: permissionId } })
        .then(() => {
          request(server)
            .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 422 when updated with invalid param', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: { invalid: null } })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 for policy and projectTemplateId updated with existing(non-deleted) values', (done) => {
      const newParam = _.assign({}, body.param, { projectTemplateId: templateId });
      models.WorkManagementPermission.create(newParam)
        .then(() => {
          request(server)
            .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send({ param: newParam })
            .expect('Content-Type', /json/)
            .expect(422, done);
        });
    });

    it('should return 422 for policy and projectTemplateId updated with existing(deleted) values', (done) => {
      const newParam = _.assign({}, body.param, { projectTemplateId: templateId });
      models.WorkManagementPermission.create(newParam)
        .then((p) => {
          models.WorkManagementPermission.destroy({ where: { id: p.id } });
        })
        .then(() => {
          request(server)
            .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send({ param: newParam })
            .expect('Content-Type', /json/)
            .expect(422, done);
        });
    });

    it('should return 200 for policy updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.permission;
      delete partialBody.param.projectTemplateId;

      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(permissionId);
          resJson.policy.should.be.eql(partialBody.param.policy);
          resJson.permission.should.be.eql(permission.permission);
          resJson.projectTemplateId.should.be.eql(permission.projectTemplateId);
          resJson.createdBy.should.be.eql(permission.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin permission updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.policy;
      delete partialBody.param.projectTemplateId;

      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(permissionId);
          resJson.policy.should.be.eql(permission.policy);
          resJson.permission.should.be.eql(partialBody.param.permission);
          resJson.projectTemplateId.should.be.eql(permission.projectTemplateId);
          resJson.createdBy.should.be.eql(permission.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin projectTemplateId updated', (done) => {
      const partialBody = _.cloneDeep(body);
      partialBody.param = _.assign({}, partialBody.param, { projectTemplateId: templateId });
      delete partialBody.param.policy;
      delete partialBody.param.permission;
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(permissionId);
          resJson.policy.should.be.eql(permission.policy);
          resJson.permission.should.be.eql(permission.permission);
          resJson.projectTemplateId.should.be.eql(partialBody.param.projectTemplateId);
          resJson.createdBy.should.be.eql(permission.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin all fields updated', (done) => {
      const newParam = _.assign({}, body.param, { projectTemplateId: templateId });
      request(server)
        .patch(`/v4/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: newParam })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(permissionId);
          resJson.policy.should.be.eql(body.param.policy);
          resJson.permission.should.be.eql(body.param.permission);
          resJson.projectTemplateId.should.be.eql(newParam.projectTemplateId);
          resJson.createdBy.should.be.eql(permission.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });
  });
});
