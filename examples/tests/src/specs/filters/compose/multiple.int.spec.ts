import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { listUsersQuery } from '../../../helpers/queries';

const USERNAME = 'jack-sparrow';
describe('Multiple filters', () => {
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

  it('should filter by multiple criteria (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _eq: USERNAME }, verified: { _eq: true } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by multiple criteria (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _eq: USERNAME }, verified: { _eq: false } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
