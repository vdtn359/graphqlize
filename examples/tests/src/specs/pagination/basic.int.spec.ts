import { Server } from 'http';
import { clearDB, getServer } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFactory } from '../../helpers/factories';
import { listUsersQuery } from '../../helpers/queries';

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
        provider: 'local',
      })
    );

    users.push(
      await userFactory({
        username: 'jack-sparrow',
        provider: 'local',
      })
    );

    users.push(
      await userFactory({
        username: 'white-beard',
        provider: 'google',
      })
    );

    users.push(
      await userFactory({
        username: 'black-beard',
        provider: 'facebook',
      })
    );
  });

  it('should allow pagination', async () => {
    const { body: response } = await listUsersQuery(server, {
      pagination: { limit: 1, offset: 1 },
      sort: [{ username: { direction: 'ASC' } }],
      filter: { provider: { _eq: 'local' } },
    });
    expectUserMatchesUserResponse(users[1], response.data.listUsers.records[0]);
    expect(response.data.listUsers.records.length).toEqual(1);
    expect(response.data.listUsers.count).toEqual(2);
  });
});
