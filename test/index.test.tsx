import { logger } from 'firebase-functions/v1';
import {
  Functions,
  idempotenceGuarantor,
  parameterLogger,
  timeoutLogger,
} from '../src';
import { getFirestore } from 'firebase-admin/firestore';

test('test', () => {
  const functions = new Functions();

  functions.use(parameterLogger());
  functions.use(idempotenceGuarantor(getFirestore));
  functions.use(timeoutLogger());
  functions.use(({ functionType, options, parameters, next }) => {
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
  functions.useDeployment(({ options }) => ({
    // for reduce cold start latency
    memory: '1GB',
    ...options,
  }));

  functions.builder().https.onCall(() => {});

  expect(true).toEqual(true);
});
