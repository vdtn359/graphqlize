import { sequelize } from './database/sequelize';

export default async () => {
  await sequelize.close();
  process.exit(0);
};
