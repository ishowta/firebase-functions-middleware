import {
  FunctionBuilder as OriginalFunctionBuilder,
  DeploymentOptions,
  RuntimeOptions,
} from 'firebase-functions';
import { RefBuilder as OriginalRefBuilder } from 'firebase-functions/lib/v1/providers/database';
import { TaskQueueBuilder as OriginalTaskQueueBuilder } from 'firebase-functions/v1/tasks';
import { DocumentBuilder as OriginalDocumentBuilder } from 'firebase-functions/v1/firestore';
import { AnalyticsEventBuilder as OriginalAnalyticsEventBuilder } from 'firebase-functions/v1/analytics';
import { ObjectBuilder as OriginalObjectBuilder } from 'firebase-functions/v1/storage';
import { TopicBuilder as OriginalTopicBuilder } from 'firebase-functions/v1/pubsub';
import { ScheduleBuilder as OriginalScheduleBuilder } from 'firebase-functions/v1/pubsub';
import { UserBuilder as OriginalUserBuilder } from 'firebase-functions/v1/auth';
import { TestMatrixBuilder as OriginalTestMatrixBuilder } from 'firebase-functions/v1/testLab';

export type FunctionsHandlers = {
  'https.onRequest': Parameters<
    OriginalFunctionBuilder['https']['onRequest']
  >[0];
  'https.onCall': Parameters<OriginalFunctionBuilder['https']['onCall']>[0];
  'tasks.taskQueue.onDispatch': Parameters<
    OriginalTaskQueueBuilder['onDispatch']
  >[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'database.ref.onWrite': Parameters<OriginalRefBuilder<any>['onWrite']>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'database.ref.onUpdate': Parameters<OriginalRefBuilder<any>['onUpdate']>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'database.ref.onCreate': Parameters<OriginalRefBuilder<any>['onCreate']>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'database.ref.onDelete': Parameters<OriginalRefBuilder<any>['onDelete']>[0];
  'firestore.document.onWrite': Parameters<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OriginalDocumentBuilder<any>['onWrite']
  >[0];
  'firestore.document.onUpdate': Parameters<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OriginalDocumentBuilder<any>['onUpdate']
  >[0];
  'firestore.document.onCreate': Parameters<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OriginalDocumentBuilder<any>['onCreate']
  >[0];
  'firestore.document.onDelete': Parameters<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OriginalDocumentBuilder<any>['onDelete']
  >[0];
  'analytics.event.onLog': Parameters<
    OriginalAnalyticsEventBuilder['onLog']
  >[0];
  'remoteConfig.onUpdate': Parameters<
    OriginalFunctionBuilder['remoteConfig']['onUpdate']
  >[0];
  'storage.object.onArchive': Parameters<OriginalObjectBuilder['onArchive']>[0];
  'storage.object.onDelete': Parameters<OriginalObjectBuilder['onDelete']>[0];
  'storage.object.onFinalize': Parameters<
    OriginalObjectBuilder['onFinalize']
  >[0];
  'storage.object.onMetadataUpdate': Parameters<
    OriginalObjectBuilder['onMetadataUpdate']
  >[0];
  'pubsub.topic.onPublish': Parameters<OriginalTopicBuilder['onPublish']>[0];
  'pubsub.schedule.onRun': Parameters<OriginalScheduleBuilder['onRun']>[0];
  'auth.user.onCreate': Parameters<OriginalUserBuilder['onCreate']>[0];
  'auth.user.onDelete': Parameters<OriginalUserBuilder['onDelete']>[0];
  'auth.user.beforeCreate': Parameters<OriginalUserBuilder['beforeCreate']>[0];
  'auth.user.beforeSignIn': Parameters<OriginalUserBuilder['beforeSignIn']>[0];
  'testlab.testmatrix.onComplete': Parameters<
    OriginalTestMatrixBuilder['onComplete']
  >[0];
};

type MiddlewareParams = {
  [FunctionType in keyof FunctionsHandlers]: {
    functionType: FunctionType;
    parameters: Parameters<FunctionsHandlers[FunctionType]>;
    options: DeploymentOptions;
    next: (
      ...parameters: Parameters<FunctionsHandlers[FunctionType]>
    ) => ReturnType<FunctionsHandlers[FunctionType]>;
  };
};

export type Middleware = (
  params: MiddlewareParams[keyof FunctionsHandlers]
) => void | Promise<void>;

function applyMiddlewares<FunctionType extends keyof FunctionsHandlers>(
  middleware: Middleware,
  options: DeploymentOptions,
  functionType: FunctionType,
  handler: FunctionsHandlers[FunctionType]
): FunctionsHandlers[FunctionType] {
  return (async (
    ...parameters: Parameters<FunctionsHandlers[FunctionType]>
  ) => {
    let result;
    await middleware({
      functionType,
      options,
      parameters,
      next: async (...outputParameters: typeof parameters) => {
        result = await (handler as any)(...outputParameters);
        return result;
      },
    } as any);
    return result;
  }) as any;
}

export class FunctionBuilder {
  deploymentOptions: DeploymentOptions;
  middleware: Middleware;

  constructor(options: DeploymentOptions = {}) {
    this.middleware = ({ parameters, next }) => next(...parameters);
    this.deploymentOptions = options;
  }

  region(...regions: Parameters<OriginalFunctionBuilder['region']>) {
    this.deploymentOptions.regions = regions;
    return this;
  }

  runWith(runtimeOptions: RuntimeOptions) {
    this.deploymentOptions = {
      ...this.deploymentOptions,
      ...runtimeOptions,
    };
    return this;
  }

  use(middleware: Middleware) {
    const prevMiddleware = this.middleware;
    this.middleware = ({ functionType, options, parameters, next }) =>
      prevMiddleware({
        functionType,
        options,
        parameters,
        next: (...nextParameters: typeof parameters) =>
          middleware({
            functionType,
            options,
            parameters: nextParameters,
            next,
          } as any),
      } as any);
  }

  get https() {
    return {
      onRequest: (handler: FunctionsHandlers['https.onRequest']) =>
        new OriginalFunctionBuilder(this.deploymentOptions).https.onRequest(
          applyMiddlewares(
            this.middleware,
            this.deploymentOptions,
            'https.onRequest',
            handler
          )
        ),
      onCall: (handler: FunctionsHandlers['https.onCall']) =>
        new OriginalFunctionBuilder(this.deploymentOptions).https.onCall(
          applyMiddlewares(
            this.middleware,
            this.deploymentOptions,
            'https.onCall',
            handler
          )
        ),
    };
  }

  get firestore() {
    return {
      document: <Path extends string>(path: Path) => ({
        onWrite: (
          handler: Parameters<OriginalDocumentBuilder<Path>['onWrite']>[0]
        ) => {
          return new OriginalFunctionBuilder(this.deploymentOptions).firestore
            .document(path)
            .onWrite(
              applyMiddlewares(
                this.middleware,
                this.deploymentOptions,
                'firestore.document.onWrite',
                handler as any
              )
            );
        },

        onUpdate: (
          handler: Parameters<OriginalDocumentBuilder<Path>['onUpdate']>[0]
        ) => {
          return new OriginalFunctionBuilder(this.deploymentOptions).firestore
            .document(path)
            .onUpdate(
              applyMiddlewares(
                this.middleware,
                this.deploymentOptions,
                'firestore.document.onUpdate',
                handler as any
              )
            );
        },

        onCreate: (
          handler: Parameters<OriginalDocumentBuilder<Path>['onCreate']>[0]
        ) => {
          return new OriginalFunctionBuilder(this.deploymentOptions).firestore
            .document(path)
            .onCreate(
              applyMiddlewares(
                this.middleware,
                this.deploymentOptions,
                'firestore.document.onCreate',
                handler as any
              )
            );
        },

        onDelete: (
          handler: Parameters<OriginalDocumentBuilder<Path>['onDelete']>[0]
        ) => {
          return new OriginalFunctionBuilder(this.deploymentOptions).firestore
            .document(path)
            .onDelete(
              applyMiddlewares(
                this.middleware,
                this.deploymentOptions,
                'firestore.document.onDelete',
                handler as any
              )
            );
        },
      }),
    };
  }
}

export * from './middlewares';
