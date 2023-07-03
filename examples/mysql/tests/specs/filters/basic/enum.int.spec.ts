import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

describe('JSON filters', () => {
  let user: any;
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    user = await userFactory({
      provider: 'local',
    });
  });

  it('empty', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { provider: {} },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { provider: { _eq: 'local' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { provider: { _neq: 'local' } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('in', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { provider: { _in: ['local'] } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notIn', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { provider: { _notIn: ['local'] } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
