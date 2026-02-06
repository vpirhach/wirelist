const path = require('path');

module.exports = function (options) {
  // Configure ts-loader to skip type checking (transpile only)
  // Types are validated locally during development
  const rules = (options.module?.rules || []).map((rule) => {
    if (rule.loader === 'ts-loader' || (rule.use && rule.use.loader === 'ts-loader')) {
      return {
        ...rule,
        options: { ...(rule.options || {}), transpileOnly: true },
        use: rule.use
          ? { ...rule.use, options: { ...(rule.use.options || {}), transpileOnly: true } }
          : undefined,
      };
    }
    return rule;
  });

  // Remove ForkTsCheckerWebpackPlugin (type checking plugin) if present
  const plugins = (options.plugins || []).filter(
    (plugin) => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin',
  );

  return {
    ...options,
    module: { ...options.module, rules },
    plugins,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@prisma/client$': path.resolve(__dirname, 'prisma/generated/prisma/client.ts'),
      },
    },
  };
};
