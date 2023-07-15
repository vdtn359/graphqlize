import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { listUsersQuery } from '../../../helpers/queries';
import { userFactory } from '../../../helpers/factories';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';

describe('OR filters', () => {
  const users: any = [];
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());
  beforeEach(async () => {
    users[0] = await userFactory({
      username: 'jack-sparrow',
    });

    users[1] = await userFactory({
      username: 'brown-beard',
      mentorId: users[0].id,
      provider: 'local',
    });

    users[2] = await userFactory({
      username: 'black-beard',
      mentorId: users[0].id,
      provider: 'google',
    });

    users[3] = await userFactory({
      username: 'white-beard',
      mentorId: users[1].id,
      provider: 'facebook',
    });
  });

  it('should filter by or criteria', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _or: [
          { students: { username: { _contains: 'brown' } } },
          { students: { provider: { _eq: 'google' } } },
        ],
      },
    });
    expectUserMatchesUserResponse(users[0], response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by or criteria', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        students: {
          _or: [
            { username: { _contains: 'brown' } },
            { provider: { _eq: 'google' } },
          ],
        },
      },
    });
    expectUserMatchesUserResponse(users[0], response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });
});
