import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import asyncHandler from 'express-async-handler';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      //decode token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decodedToken.id).select('-password');
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Token Failed. Access Denied...');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Token Failed. Access Denied...');
  }
});

export default protect;
