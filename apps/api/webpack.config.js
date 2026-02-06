const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@prisma/client$': path.resolve(__dirname, 'prisma/generated/prisma/client.ts'),
      },
    },
  };
};
