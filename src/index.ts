import {
  FunctionBuilder as OriginalFunctionBuilder,
  DeploymentOptions,
  RuntimeOptions,
  ScheduleRetryConfig,
} from 'firebase-functions';
import {
  InstanceBuilder as OriginalInstanceBuilder,
  RefBuilder as OriginalRefBuilder,
} from 'firebase-functions/lib/v1/providers/database';
import {
  TaskQueueBuilder as OriginalTaskQueueBuilder,
  TaskQueueOptions,
} from 'firebase-functions/v1/tasks';
import { DocumentBuilder as OriginalDocumentBuilder } from 'firebase-functions/v1/firestore';
import { AnalyticsEventBuilder as OriginalAnalyticsEventBuilder } from 'firebase-functions/v1/analytics';
import {
  BucketBuilder as OriginalBucketBuilder,
  ObjectBuilder as OriginalObjectBuilder,
} from 'firebase-functions/v1/storage';
import { TopicBuilder as OriginalTopicBuilder } from 'firebase-functions/v1/pubsub';
import { ScheduleBuilder as OriginalScheduleBuilder } from 'firebase-functions/v1/pubsub';
import {
  UserBuilder as OriginalUserBuilder,
  UserOptions,
} from 'firebase-functions/v1/auth';
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

  get tasks() {
    return {
      taskQueue: (options?: TaskQueueOptions) =>
        new TaskQueueBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).tasks.taskQueue(
            options
          ),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get database() {
    return {
      instance: (instance: string) =>
        new InstanceBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).database.instance(
            instance
          ),
          this.deploymentOptions,
          this.middleware
        ),
      ref: <Ref extends string>(path: Ref) =>
        new RefBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).database.ref(
            path
          ),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get firestore() {
    return {
      document: <Path extends string>(path: Path) =>
        new DocumentBuilder(
          new OriginalFunctionBuilder(
            this.deploymentOptions
          ).firestore.document(path),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get analytics() {
    return {
      event: (analyticsEventType: string) =>
        new AnalyticsEventBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).analytics.event(
            analyticsEventType
          ),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get remoteConfig() {
    return {
      onUpdate: (handler: FunctionsHandlers['remoteConfig.onUpdate']) => {
        return new OriginalFunctionBuilder(
          this.deploymentOptions
        ).remoteConfig.onUpdate(
          applyMiddlewares(
            this.middleware,
            this.deploymentOptions,
            'remoteConfig.onUpdate',
            handler
          )
        );
      },
    };
  }

  get storage() {
    return {
      bucket: (bucket?: string) =>
        new BucketBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).storage.bucket(
            bucket
          ),
          this.deploymentOptions,
          this.middleware
        ),
      object: () =>
        new ObjectBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).storage.object(),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get pubsub() {
    return {
      topic: (topic: string) =>
        new TopicBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).pubsub.topic(
            topic
          ),
          this.deploymentOptions,
          this.middleware
        ),
      schedule: (schedule: string) =>
        new ScheduleBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).pubsub.schedule(
            schedule
          ),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get auth() {
    return {
      user: (userOptions?: UserOptions) =>
        new UserBuilder(
          new OriginalFunctionBuilder(this.deploymentOptions).auth.user(
            userOptions
          ),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }

  get testLab() {
    return {
      testMatrix: () =>
        new TestMatrixBuilder(
          new OriginalFunctionBuilder(
            this.deploymentOptions
          ).testLab.testMatrix(),
          this.deploymentOptions,
          this.middleware
        ),
    };
  }
}

export class InstanceBuilder {
  constructor(
    private originalInstanceBuilder: OriginalInstanceBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  ref<Ref extends string>(path: Ref) {
    return new RefBuilder(
      this.originalInstanceBuilder.ref(path),
      this.options,
      this.middleware
    );
  }
}

export class RefBuilder<Ref extends string> {
  constructor(
    private originalRefBuilder: OriginalRefBuilder<Ref>,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onWrite(handler: Parameters<OriginalDocumentBuilder<Ref>['onWrite']>[0]) {
    return this.originalRefBuilder.onWrite(
      applyMiddlewares(
        this.middleware,
        this.options,
        'database.ref.onWrite',
        handler as any
      )
    );
  }

  onUpdate(handler: Parameters<OriginalDocumentBuilder<Ref>['onUpdate']>[0]) {
    return this.originalRefBuilder.onUpdate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'database.ref.onUpdate',
        handler as any
      )
    );
  }

  onCreate(handler: Parameters<OriginalDocumentBuilder<Ref>['onCreate']>[0]) {
    return this.originalRefBuilder.onCreate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'database.ref.onCreate',
        handler as any
      )
    );
  }

  onDelete(handler: Parameters<OriginalDocumentBuilder<Ref>['onDelete']>[0]) {
    return this.originalRefBuilder.onDelete(
      applyMiddlewares(
        this.middleware,
        this.options,
        'database.ref.onDelete',
        handler as any
      )
    );
  }
}

export class TaskQueueBuilder {
  constructor(
    private originalTaskQueueBuilder: OriginalTaskQueueBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onDispatch(handler: Parameters<OriginalTaskQueueBuilder['onDispatch']>[0]) {
    return this.originalTaskQueueBuilder.onDispatch(
      applyMiddlewares(
        this.middleware,
        this.options,
        'tasks.taskQueue.onDispatch',
        handler
      )
    );
  }
}

export class DocumentBuilder<Path extends string> {
  constructor(
    private originalDocumentBuilder: OriginalDocumentBuilder<Path>,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onWrite(handler: Parameters<OriginalDocumentBuilder<Path>['onWrite']>[0]) {
    return this.originalDocumentBuilder.onWrite(
      applyMiddlewares(
        this.middleware,
        this.options,
        'firestore.document.onWrite',
        handler as any
      )
    );
  }

  onUpdate(handler: Parameters<OriginalDocumentBuilder<Path>['onUpdate']>[0]) {
    return this.originalDocumentBuilder.onUpdate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'firestore.document.onUpdate',
        handler as any
      )
    );
  }

  onCreate(handler: Parameters<OriginalDocumentBuilder<Path>['onCreate']>[0]) {
    return this.originalDocumentBuilder.onCreate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'firestore.document.onCreate',
        handler as any
      )
    );
  }

  onDelete(handler: Parameters<OriginalDocumentBuilder<Path>['onDelete']>[0]) {
    return this.originalDocumentBuilder.onDelete(
      applyMiddlewares(
        this.middleware,
        this.options,
        'firestore.document.onDelete',
        handler as any
      )
    );
  }
}

export class AnalyticsEventBuilder {
  constructor(
    private originalAnalyticsEventBuilder: OriginalAnalyticsEventBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onLog(handler: Parameters<OriginalAnalyticsEventBuilder['onLog']>[0]) {
    return this.originalAnalyticsEventBuilder.onLog(
      applyMiddlewares(
        this.middleware,
        this.options,
        'analytics.event.onLog',
        handler
      )
    );
  }
}

export class BucketBuilder {
  constructor(
    private originalBucketBuilderBuilder: OriginalBucketBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  object() {
    return new ObjectBuilder(
      this.originalBucketBuilderBuilder.object(),
      this.options,
      this.middleware
    );
  }
}

export class ObjectBuilder {
  constructor(
    private originalObjectBuilder: OriginalObjectBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onArchive(handler: Parameters<OriginalObjectBuilder['onArchive']>[0]) {
    return this.originalObjectBuilder.onArchive(
      applyMiddlewares(
        this.middleware,
        this.options,
        'storage.object.onArchive',
        handler
      )
    );
  }

  onDelete(handler: Parameters<OriginalObjectBuilder['onDelete']>[0]) {
    return this.originalObjectBuilder.onDelete(
      applyMiddlewares(
        this.middleware,
        this.options,
        'storage.object.onDelete',
        handler
      )
    );
  }

  onFinalize(handler: Parameters<OriginalObjectBuilder['onFinalize']>[0]) {
    return this.originalObjectBuilder.onFinalize(
      applyMiddlewares(
        this.middleware,
        this.options,
        'storage.object.onFinalize',
        handler
      )
    );
  }

  onMetadataUpdate(
    handler: Parameters<OriginalObjectBuilder['onMetadataUpdate']>[0]
  ) {
    return this.originalObjectBuilder.onMetadataUpdate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'storage.object.onMetadataUpdate',
        handler
      )
    );
  }
}

export class TopicBuilder {
  constructor(
    private originalTopicBuilder: OriginalTopicBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onPublish(handler: Parameters<OriginalTopicBuilder['onPublish']>[0]) {
    return this.originalTopicBuilder.onPublish(
      applyMiddlewares(
        this.middleware,
        this.options,
        'pubsub.topic.onPublish',
        handler
      )
    );
  }
}

export class ScheduleBuilder {
  constructor(
    private originalScheduleBuilder: OriginalScheduleBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  retryConfig(config: ScheduleRetryConfig): ScheduleBuilder {
    this.originalScheduleBuilder.retryConfig(config);
    return this;
  }

  timeZone(timeZone: string): ScheduleBuilder {
    this.originalScheduleBuilder.timeZone(timeZone);
    return this;
  }

  onRun(handler: Parameters<OriginalScheduleBuilder['onRun']>[0]) {
    return this.originalScheduleBuilder.onRun(
      applyMiddlewares(
        this.middleware,
        this.options,
        'pubsub.schedule.onRun',
        handler
      )
    );
  }
}

export class UserBuilder {
  constructor(
    private originalUserBuilder: OriginalUserBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onCreate(handler: Parameters<OriginalUserBuilder['onCreate']>[0]) {
    return this.originalUserBuilder.onCreate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'auth.user.onCreate',
        handler
      )
    );
  }

  onDelete(handler: Parameters<OriginalUserBuilder['onDelete']>[0]) {
    return this.originalUserBuilder.onDelete(
      applyMiddlewares(
        this.middleware,
        this.options,
        'auth.user.onDelete',
        handler
      )
    );
  }

  beforeCreate(handler: Parameters<OriginalUserBuilder['beforeCreate']>[0]) {
    return this.originalUserBuilder.beforeCreate(
      applyMiddlewares(
        this.middleware,
        this.options,
        'auth.user.beforeCreate',
        handler
      )
    );
  }

  beforeSignIn(handler: Parameters<OriginalUserBuilder['beforeSignIn']>[0]) {
    return this.originalUserBuilder.beforeSignIn(
      applyMiddlewares(
        this.middleware,
        this.options,
        'auth.user.beforeSignIn',
        handler
      )
    );
  }
}

export class TestMatrixBuilder {
  constructor(
    private originalTestMatrixBuilder: OriginalTestMatrixBuilder,
    private options: DeploymentOptions,
    private middleware: Middleware
  ) {}

  onComplete(handler: Parameters<OriginalTestMatrixBuilder['onComplete']>[0]) {
    return this.originalTestMatrixBuilder.onComplete(
      applyMiddlewares(
        this.middleware,
        this.options,
        'testlab.testmatrix.onComplete',
        handler
      )
    );
  }
}

export * from './middlewares';
