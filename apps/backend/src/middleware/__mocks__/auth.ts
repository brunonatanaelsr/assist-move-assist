// @ts-ignore
const authenticateToken = jest.fn(
  (req, res, next) => {
    next();
  }
);

export { authenticateToken };
