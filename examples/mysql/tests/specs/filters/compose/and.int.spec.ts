import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

const USERNAME = 'jack-sparrow';
describe('And filters', () => {
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
      username: USERNAME,
      verified: true,
    });
  });

  it('should filter by and criteria (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _and: [{ username: { _eq: USERNAME } }, { verified: { _eq: true } }],
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by and criteria (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _and: [{ username: { _eq: USERNAME } }, { verified: { _eq: false } }],
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
