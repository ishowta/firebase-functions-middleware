import { Firestore } from 'firebase-admin/firestore';
import { EventContext, logger } from 'firebase-functions/v1';
import { Middleware } from '..';

export const idempotenceGuarantor =
  (
    getFirestore: () => Firestore | Promise<Firestore>,
    middlewareOptions: {
      firestoreCollectionName: string;
    } = {
      firestoreCollectionName: 'events',
    }
  ): Middleware =>
  async ({ functionType, options, parameters, next }) => {
    let context: EventContext | undefined = undefined;
    switch (functionType) {
      case 'https.onCall':
      case 'https.onRequest':
      case 'tasks.taskQueue.onDispatch':
        break;
      case 'pubsub.schedule.onRun': {
        context = parameters[0];
        break;
      }
      default: {
        context = parameters[1];
        break;
      }
    }

    if (context == null) {
      return next(...parameters);
    }

    const firestore = await getFirestore();
    const eventsRef = firestore.collection(
      middlewareOptions.firestoreCollectionName
    );
    const eventRef = eventsRef.doc(context.eventId);
    const called = await firestore.runTransaction(async (t) => {
      const event = await t.get(eventRef);
      if (event.exists) {
        return true;
      }
      t.create(eventRef, {});
      return false;
    });

    if (called) {
      logger.debug(
        `event ${context.eventId}(${context.eventType}) trigger already running, skip.`
      );
      return;
    }

    return next(...parameters);
  };
