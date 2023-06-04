import { logger } from 'firebase-functions/v1';
import {
  Functions,
  idempotenceGuarantor,
  parameterLogger,
  timeoutLogger,
} from '../src';
import { getFirestore, initializeFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

test('test', () => {
  if (getApps().length === 0) {
    const firebase = initializeApp();
    initializeFirestore(firebase);
  }

  const app = new Functions();

  app.use(parameterLogger());
  app.use(idempotenceGuarantor(getFirestore));
  app.use(timeoutLogger());
  app.use(({ functionType, options, parameters, next }) => {
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
  app.useDeployment(({ options }) => ({
    // for reduce cold start latency
    memory: '1GB',
    ...options,
  }));

  const functions = app.builder;

  functions().https.onCall(() => {});

  expect(true).toEqual(true);
});
