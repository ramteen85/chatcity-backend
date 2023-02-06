import { redisClient } from '../config/redis.js';
import asyncHandler from 'express-async-handler';

// limit the number of requests for an endpoint

export const rateLimiter = (SECONDS_LIMIT, LIMIT_AMOUNT) => {
  return asyncHandler(async (req, res, next) => {
    const ip = req.connection.remoteAddress;
    const [response] = await redisClient
      .multi()
      .incr(ip)
      .expire(ip, SECONDS_LIMIT)
      .exec();
    if (response[1] > LIMIT_AMOUNT) {
      res.status(400);
      res.json({ message: 'whoah! ease up turbo! try again in a minute!' });
    } else next();
  });
};
