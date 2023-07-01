import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  sequelize.define(
    'stats',
    {
      // The following specification of the 'id' attribute could be omitted
      // since it is the default.
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      exp: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      likes: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      views: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
    },
    {
      freezeTableName: true,
      underscored: true,
    }
  );
};
