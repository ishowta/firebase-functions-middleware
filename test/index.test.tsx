import { logger } from 'firebase-functions/v1';
import {
  FunctionBuilder,
  idempotenceGuarantor,
  parameterLogger,
  timeoutLogger,
} from '../src';

test('test', () => {
  const functions = new FunctionBuilder({});

  functions.use(parameterLogger());
  functions.use(idempotenceGuarantor());
  functions.use(timeoutLogger());
  functions.runWith({
    // for reduce cold start latency
    memory: '1GB',
  });
  functions.use(({ functionType, parameters, next }) => {
    switch (functionType) {
      case 'https.onRequest': {
        const [req, resp] = parameters;
        resp.status = (code: number) => {
          logger.log(`status code: ${code}`);
          return resp;
        };
        return next(req, resp);
      }
      default:
        return next(...parameters);
    }
  });
  expect(true).toEqual(true);
});
