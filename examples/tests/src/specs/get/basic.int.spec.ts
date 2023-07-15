import { Server } from 'http';
import { clearDB, getServer } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFactory } from '../../helpers/factories';
import { getUserQuery } from '../../helpers/queries';

describe('Get object', () => {
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
    user = await userFactory();
    await user.reload();
  });

  it('should get by id', async () => {
    const { body: response } = await getUserQuery(server, {
      by: {
        id: user.id,
      },
    });
    expectUserMatchesUserResponse(user, response.data.getUser);
  });

  it('should get by unique key', async () => {
    const { body: response } = await getUserQuery(server, {
      by: {
        username: user.username,
      },
    });
    expectUserMatchesUserResponse(user, response.data.getUser);
  });
});
