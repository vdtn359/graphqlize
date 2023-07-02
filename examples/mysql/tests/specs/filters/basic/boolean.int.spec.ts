import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

describe('Boolean filters', () => {
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
      verified: true,
    });
  });

  it('empty', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { verified: {} },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { verified: { _eq: true } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { verified: { _neq: true } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
