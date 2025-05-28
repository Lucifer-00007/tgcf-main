module.exports = {
  secret: process.env.JWT_SECRET (() => {
    throw new Error('JWT_SECRET environment variable is required');
  })(),
};
