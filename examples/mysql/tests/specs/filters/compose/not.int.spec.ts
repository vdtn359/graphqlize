import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { statsFactory, userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

const USERNAME = 'jack-sparrow';

describe('Not filters', () => {
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
    const stats: any = await statsFactory({
      views: 100,
      likes: 100,
      exp: 3,
    });
    user = await userFactory({
      username: USERNAME,
      verified: true,
      statsId: stats.id,
    });
  });

  it('should filter NOT (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { username: { _eq: USERNAME }, verified: { _eq: false } },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter NOT with include (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { stats: { likes: { _eq: 10 } } },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter NOT (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { username: { _eq: USERNAME }, verified: { _eq: true } },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('should filter NOT with include (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { stats: { likes: { _eq: 100 } } },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
