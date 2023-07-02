import Chance from 'chance';
import { sequelize } from './sequelize';

const chance = new Chance(123);

export const statsFactory = async (props: Record<string, any> = {}) =>
  sequelize.models.stats.create({
    views: chance.integer({ min: 0, max: 100 }),
    likes: chance.integer({ min: 0, max: 100 }),
    exp: chance.integer({ min: 0, max: 100 }),
    ...props,
  });

export const userFactory = async (props: Record<string, any> = {}) =>
  sequelize.models.user.create({
    username: chance.word({ length: 10 }),
    provider: chance.pickone(['local', 'facebook']),
    email: chance.email(),
    verified: chance.bool(),
    details: {
      firstName: chance.first(),
      lastName: chance.last(),
    },
    createdAt: new Date('2021-01-01T00:00:00Z'),
    ...props,
  });
