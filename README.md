# firebase functions middleware

functions v1 thin wrapper for append middlewares

## how to use

```ts
import {
    Functions,
    parameterLogger,
    timeoutLogger,
    idempotenceGuarantor
} from 'firebase-functions-middleware'
import { getFirestore, initializeFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
    const firebase = initializeApp();
    initializeFirestore(firebase);
}

const app = new Functions()
app.use(parameterLogger())
app.use(idempotenceGuarantor(getFirestore))
app.use(timeoutLogger())
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

export const functions = app.builder
```

```ts
import { functions } from '../functions'

export const helloWorld = functions().https.onCall(() => {
    return "Hello world!"
})
```

### parameterLogger

Logging data, contexts and response.

Note:

- Some data will be filtered
- Sensitive data may be displayed

```ts
functions.use(parameterLogger({
    target: {
        data: true,
        contexts: true,
        response: true
    },
    level: "DEBUG"
}))
```

### idempotenceGuarantor

For functions running `at least once`, use firestore to achieve `exactly once`.

```ts
functions.use(idempotenceGuarantor({
    firestoreCollectionName: "events" // default
}))
```

### timeoutLogger

Report an error before timeout.

```ts
functions.use(timeoutLogger({
    timing: (timeout) => timeout * 0.9 // default
}))
```
