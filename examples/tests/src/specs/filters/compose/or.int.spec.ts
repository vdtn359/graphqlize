import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { listUsersQuery } from '../../../helpers/queries';
import { userFactory } from '../../../helpers/factories';

describe('OR filters', () => {
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
      username: 'jack-sparrow',
      provider: 'local',
      email: 'test@gmail.com',
      verified: true,
    });
  });

  it('should filter by or criteria (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _or: [{ verified: { _eq: true } }, { provider: { _eq: 'google' } }],
        email: { _endsWith: 'gmail.com' },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by or criteria (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _or: [{ verified: { _eq: false } }, { provider: { _eq: 'google' } }],
        email: { _endsWith: 'gmail.com' },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('should filter by or and not', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _or: [
          { _not: { verified: { _eq: false } } },
          { provider: { _eq: 'google' } },
        ],
        email: { _endsWith: 'gmail.com' },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });
});
