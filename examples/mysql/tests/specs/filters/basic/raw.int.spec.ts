import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

describe('Raw filters', () => {
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
      username: 'John-Doe',
    });
  });

  it('has raw (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _raw: {
          expression: 'LOWER(#alias.username) LIKE ?',
          bindings: ['joh%'],
        },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('has raw (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _raw: {
          expression: 'LOWER(#alias.username) LIKE ?',
          bindings: ['je%'],
        },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
