import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { getUserQuery } from '#tests/queries';

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
