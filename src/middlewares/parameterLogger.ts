import { logger } from 'firebase-functions/v1';
import { Middleware } from '..';
import { LogSeverity } from 'firebase-functions/logger';

export const parameterLogger =
  (
    middlewareOptions: {
      target: {
        input: boolean;
        contexts: boolean;
        output: boolean;
      };
      severity: LogSeverity;
    } = {
      target: {
        input: true,
        contexts: true,
        output: true,
      },
      severity: 'DEBUG',
    }
  ): Middleware =>
  async ({ functionType, options, parameters, next }) => {
    if (middlewareOptions.target.input || middlewareOptions.target.contexts) {
      let input: unknown = undefined;
      let context: unknown = undefined;
      switch (functionType) {
        case 'https.onRequest': {
          break;
        }
        case 'https.onCall': {
          input = parameters[0];
          const callableContext = parameters[1];
          context = {
            ...callableContext,
            rawRequest: {
              ...Object.fromEntries(
                Object.entries(callableContext.rawRequest).filter(
                  ([key]) => !key.startsWith('_')
                )
              ),
              socket: '[Filtered]',
              rawBody: '[Filtered]',
              body: '[Filtered]',
              rawHeaders: callableContext.rawRequest.rawHeaders.map(
                (headerStr) =>
                  headerStr.startsWith('Bearer ')
                    ? 'Bearer [Filtered]'
                    : headerStr
              ),
            },
          };
          break;
        }
        case 'pubsub.schedule.onRun': {
          context = parameters[0];
          break;
        }
        default: {
          input = parameters[0];
          context = parameters[1];
          break;
        }
      }

      logger.write({
        severity: middlewareOptions.severity,
        message: 'request',
        ...(middlewareOptions.target.input ? { input } : {}),
        ...(middlewareOptions.target.contexts ? { context } : {}),
      });
    }

    const output: unknown = await next(...parameters);

    if (middlewareOptions.target.output) {
      logger.write({
        severity: middlewareOptions.severity,
        message: 'response',
        output,
      });
    }

    return output;
  };
