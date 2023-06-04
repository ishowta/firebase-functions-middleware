import { logger } from 'firebase-functions/v1';
import { Middleware } from '..';

export const timeoutLogger =
  (
    middlewareOptions: {
      timing: (timeoutSeconds: number) => number;
    } = {
      timing: (timeoutSeconds) => timeoutSeconds * 0.9,
    }
  ): Middleware =>
  async ({ functionType, options, parameters, next }) => {
    if (typeof options.timeoutSeconds === 'object') {
      logger.warn(
        "timeoutSeconds is `Expresion`. Can't calculate timeout, skip!"
      );
      return next(...parameters);
    }
    const timeoutSeconds = options.timeoutSeconds ?? 60;
    const timeout = setTimeout(() => {
      logger.error('timeout');
    }, middlewareOptions.timing(timeoutSeconds) * 1000);
    try {
      return await next(...parameters);
    } finally {
      clearTimeout(timeout);
    }
  };
