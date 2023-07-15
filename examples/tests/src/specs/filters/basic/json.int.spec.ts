import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { listUsersQuery } from '../../../helpers/queries';

describe('JSON filters', () => {
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
      details: {
        firstName: 'John',
        lastName: 'Doe',
        age: 27,
      },
    });
  });

  it('has fields', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        details: {
          _fields: [
            { field: 'firstName', value: { _eq: 'John' } },
            { field: 'age', value: { _gt: 25 } },
          ],
        },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('has fields but no match', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        details: {
          _fields: [
            { field: 'firstName', value: { _eq: 'John' } },
            { field: 'age', value: { _gt: 28 } },
          ],
        },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
