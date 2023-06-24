const path = require('path');

module.exports = {
  ...require('../../.eslintrc'),
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: path.resolve(__dirname, 'tsconfig.json'),
      },
    },
  },
};
