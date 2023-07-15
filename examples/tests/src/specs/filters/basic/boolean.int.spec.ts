import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { listUsersQuery } from '../../../helpers/queries';

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
