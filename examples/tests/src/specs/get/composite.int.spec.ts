import { Server } from 'http';
import { clearDB, getServer } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFactory } from '../../helpers/factories';
import { getUserQuery } from '../../helpers/queries';

describe('Get object by composite key', () => {
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
      provider: 'google',
      email: 'test@gmail.com',
    });
    await user.reload();
  });

  it('should get by provider + email (match)', async () => {
    const { body: response } = await getUserQuery(server, {
      by: {
        email__provider: {
          email: user.email,
          provider: user.provider,
        },
      },
    });
    expectUserMatchesUserResponse(user, response.data.getUser);
  });
});
