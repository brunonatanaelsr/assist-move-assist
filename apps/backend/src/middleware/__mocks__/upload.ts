// @ts-ignore
const uploadMiddleware = jest.fn(
  (req, res, next) => {
    next();
  }
);

export { uploadMiddleware };
