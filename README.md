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

export const functions = new Functions()

functions.use(parameterLogger())
functions.use(idempotenceGuarantor())
functions.use(timeoutLogger())
functions.runWith({
    // for reduce cold start latency
    memory: "1G"
})
functions.use((parameters, next) => {
    switch(parameters.type){
        case 'https.onRequest':
            const res = (...params: any[]) => {
                return parameters.res(...params)
            }
            return next({...parameters, res})
        default:
            return next(parameters)
    }
})
functions.providers("firestore", "storage").runWith({
    timeoutSeconds: 540
})
```

## pre defined middlewares

It is recommended to apply the pre-built set if there is no opinion.

```ts
import {
    Functions,
    applyRecommended
} from 'firebase-functions-middleware'

export const functions = new Functions()

applyRecommended(functions)

```

### parameterLogger

Logging data, contexts and response.

```ts
functions.use(parameterLogger({
    target: {
        data: true,
        contexts: true,
        response: true
    },
    level: "DEBUG",
    excludeFields: [
        "password"
    ]
}))
```

### idempotenceGuarantor

For functions running `at least once`, use firestore to achieve `exactly once`.

```ts
functions.use(idempotenceGuarantor({
    firestoreCollectionName: "idempotences"
}))
```

### timeoutLogger

Report an error before timeout.

```ts
functions.use(timeoutLogger({
    timing: (timeout) => timeout * 0.9 // default
}))
```
