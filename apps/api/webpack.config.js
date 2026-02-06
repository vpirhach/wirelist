const path = require('path');

module.exports = function (options) {
  // Configure ts-loader to skip type checking (transpile only)
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

  // Remove ForkTsCheckerWebpackPlugin if present
  const plugins = (options.plugins || []).filter(
    (plugin) => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin',
  );

  // Modify externals to NOT externalize @prisma/client (bundle it instead)
  // NestJS uses webpack-node-externals which marks all node_modules as external.
  // We need @prisma/client bundled so the generated client is included in dist/main.js
  const originalExternals = options.externals || [];
  const externals = originalExternals.map((ext) => {
    if (typeof ext === 'function') {
      return (ctx, callback) => {
        const request = ctx.request || ctx;
        // Bundle @prisma/client (but keep @prisma/client/runtime/* external)
        if (typeof request === 'string' && request === '@prisma/client') {
          return callback(); // Don't externalize — bundle it
        }
        return ext(ctx, callback);
      };
    }
    return ext;
  });

  return {
    ...options,
    module: { ...options.module, rules },
    plugins,
    externals,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@prisma/client$': path.resolve(__dirname, 'prisma/generated/prisma/client.ts'),
      },
    },
  };
};
