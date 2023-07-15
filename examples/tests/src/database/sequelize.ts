import { Sequelize } from 'sequelize';
import {
  InstrumentBuilder,
  OrchestraBuilder,
  StatsBuilder,
  UserBuilder,
  UserSessionBuilder,
  SessionBuilder,
} from '../models';
import { associate } from './association';
import { Dialect, getSequelizeOptions } from '../helpers/dialect';

export const sequelize = new Sequelize(
  getSequelizeOptions(process.env.DIALECT as Dialect)
);

const modelDefiners = [
  UserBuilder,
  InstrumentBuilder,
  OrchestraBuilder,
  StatsBuilder,
  UserSessionBuilder,
  SessionBuilder,
];

for (const modelDefiner of modelDefiners) {
  modelDefiner(sequelize);
}

associate(sequelize);
