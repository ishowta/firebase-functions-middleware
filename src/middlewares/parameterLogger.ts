import { logger } from 'firebase-functions/v1';
import { Middleware } from '..';

export const parameterLogger =
  (): Middleware =>
  ({ functionType, options, parameters, next }) => {
    logger.debug('request', {
      parameters,
    });
    const result = next(...parameters);
    logger.debug('response', {
      result,
    });
  };
