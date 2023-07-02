import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

describe('Pagination', () => {
  const users: any[] = [];
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    users.push(
      await userFactory({
        username: 'brown-beard',
      })
    );

    users.push(
      await userFactory({
        username: 'jack-sparrow',
      })
    );

    users.push(
      await userFactory({
        username: 'white-beard',
      })
    );

    users.push(
      await userFactory({
        username: 'black-beard',
      })
    );
  });

  it('should allow pagination', async () => {
    const { body: response } = await listUsersQuery(server, {
      pagination: { limit: 1, offset: 1 },
      sort: [{ createdAt: { direction: 'ASC' } }],
      filter: { provider: { _eq: 'local' } },
    });
    expectUserMatchesUserResponse(users[2], response.data.listUsers.records[0]);
    expect(response.data.listUsers.records.length).toEqual(1);
    expect(response.data.listUsers.count).toEqual(2);
  });
});
