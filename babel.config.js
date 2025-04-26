module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Añade aquí cualquier plugin de Babel que necesites
    ],
  };
};
