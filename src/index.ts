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

export type DeploymentMiddleware = (params: {
  functionType: keyof FunctionsHandlers;
  options: DeploymentOptions;
}) => DeploymentOptions;

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

function applyDeploymentMiddleware(
  functionType: keyof FunctionsHandlers,
  options: DeploymentOptions,
  deploymentMiddleware: DeploymentMiddleware
) {
  return deploymentMiddleware({ functionType, options });
}

export class Functions {
  middleware: Middleware;
  deploymentMiddleware: DeploymentMiddleware;

  constructor() {
    this.middleware = ({ parameters, next }) => next(...parameters);
    this.deploymentMiddleware = ({ options }) => options;
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

  useDeployment(deploymentMiddleware: DeploymentMiddleware) {
    const prevDeploymentMiddleware = this.deploymentMiddleware;
    this.deploymentMiddleware = ({ functionType, options }) =>
      deploymentMiddleware({
        functionType,
        options: prevDeploymentMiddleware({ functionType, options }),
      });
  }

  builder(options: DeploymentOptions = {}) {
    return new FunctionBuilder(
      options,
      this.middleware,
      this.deploymentMiddleware
    );
  }
}

export class FunctionBuilder {
  constructor(
    private additionalDeploymentOptions: DeploymentOptions,
    private middleware: Middleware,
    private deploymentMiddleware: DeploymentMiddleware
  ) {}

  region(...regions: Parameters<OriginalFunctionBuilder['region']>) {
    this.additionalDeploymentOptions.regions = regions;
    return this;
  }

  runWith(runtimeOptions: RuntimeOptions) {
    this.additionalDeploymentOptions = {
      ...this.additionalDeploymentOptions,
      ...runtimeOptions,
    };
    return this;
  }

  private get options() {
    return (functionType: keyof FunctionsHandlers) =>
      applyDeploymentMiddleware(
        functionType,
        this.additionalDeploymentOptions,
        this.deploymentMiddleware
      );
  }

  get https() {
    return {
      onRequest: (handler: FunctionsHandlers['https.onRequest']) =>
        new OriginalFunctionBuilder(
          this.options('https.onRequest')
        ).https.onRequest(
          applyMiddlewares(
            this.middleware,
            this.options('https.onRequest'),
            'https.onRequest',
            handler
          )
        ),
      onCall: (handler: FunctionsHandlers['https.onCall']) =>
        new OriginalFunctionBuilder(this.options('https.onCall')).https.onCall(
          applyMiddlewares(
            this.middleware,
            this.options('https.onCall'),
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
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).tasks.taskQueue(options),
          this.options,
          this.middleware
        ),
    };
  }

  get database() {
    return {
      instance: (instance: string) =>
        new InstanceBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).database.instance(instance),
          this.options,
          this.middleware
        ),
      ref: <Ref extends string>(path: Ref) =>
        new RefBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).database.ref(path),
          this.options,
          this.middleware
        ),
    };
  }

  get firestore() {
    return {
      document: <Path extends string>(path: Path) =>
        new DocumentBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).firestore.document(path),
          this.options,
          this.middleware
        ),
    };
  }

  get analytics() {
    return {
      event: (analyticsEventType: string) =>
        new AnalyticsEventBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).analytics.event(analyticsEventType),
          this.options,
          this.middleware
        ),
    };
  }

  get remoteConfig() {
    return {
      onUpdate: (handler: FunctionsHandlers['remoteConfig.onUpdate']) => {
        return new OriginalFunctionBuilder(
          this.options('remoteConfig.onUpdate')
        ).remoteConfig.onUpdate(
          applyMiddlewares(
            this.middleware,
            this.options('remoteConfig.onUpdate'),
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
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).storage.bucket(bucket),
          this.options,
          this.middleware
        ),
      object: () =>
        new ObjectBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).storage.object(),
          this.options,
          this.middleware
        ),
    };
  }

  get pubsub() {
    return {
      topic: (topic: string) =>
        new TopicBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).pubsub.topic(topic),
          this.options,
          this.middleware
        ),
      schedule: (schedule: string) =>
        new ScheduleBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).pubsub.schedule(schedule),
          this.options,
          this.middleware
        ),
    };
  }

  get auth() {
    return {
      user: (userOptions?: UserOptions) =>
        new UserBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(this.options(functionType)).auth.user(
              userOptions
            ),
          this.options,
          this.middleware
        ),
    };
  }

  get testLab() {
    return {
      testMatrix: () =>
        new TestMatrixBuilder(
          (functionType: keyof FunctionsHandlers) =>
            new OriginalFunctionBuilder(
              this.options(functionType)
            ).testLab.testMatrix(),
          this.options,
          this.middleware
        ),
    };
  }
}

export class InstanceBuilder {
  constructor(
    private originalInstanceBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalInstanceBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  ref<Ref extends string>(path: Ref) {
    return new RefBuilder(
      (functionType: keyof FunctionsHandlers) =>
        this.originalInstanceBuilder(functionType).ref(path),
      this.options,
      this.middleware
    );
  }
}

export class RefBuilder<Ref extends string> {
  constructor(
    private originalRefBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalRefBuilder<Ref>,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onWrite(handler: Parameters<OriginalDocumentBuilder<Ref>['onWrite']>[0]) {
    return this.originalRefBuilder('database.ref.onWrite').onWrite(
      applyMiddlewares(
        this.middleware,
        this.options('database.ref.onWrite'),
        'database.ref.onWrite',
        handler as any
      )
    );
  }

  onUpdate(handler: Parameters<OriginalDocumentBuilder<Ref>['onUpdate']>[0]) {
    return this.originalRefBuilder('database.ref.onUpdate').onUpdate(
      applyMiddlewares(
        this.middleware,
        this.options('database.ref.onUpdate'),
        'database.ref.onUpdate',
        handler as any
      )
    );
  }

  onCreate(handler: Parameters<OriginalDocumentBuilder<Ref>['onCreate']>[0]) {
    return this.originalRefBuilder('database.ref.onCreate').onCreate(
      applyMiddlewares(
        this.middleware,
        this.options('database.ref.onCreate'),
        'database.ref.onCreate',
        handler as any
      )
    );
  }

  onDelete(handler: Parameters<OriginalDocumentBuilder<Ref>['onDelete']>[0]) {
    return this.originalRefBuilder('database.ref.onDelete').onDelete(
      applyMiddlewares(
        this.middleware,
        this.options('database.ref.onDelete'),
        'database.ref.onDelete',
        handler as any
      )
    );
  }
}

export class TaskQueueBuilder {
  constructor(
    private originalTaskQueueBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalTaskQueueBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onDispatch(handler: Parameters<OriginalTaskQueueBuilder['onDispatch']>[0]) {
    return this.originalTaskQueueBuilder(
      'tasks.taskQueue.onDispatch'
    ).onDispatch(
      applyMiddlewares(
        this.middleware,
        this.options('tasks.taskQueue.onDispatch'),
        'tasks.taskQueue.onDispatch',
        handler
      )
    );
  }
}

export class DocumentBuilder<Path extends string> {
  constructor(
    private originalDocumentBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalDocumentBuilder<Path>,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onWrite(handler: Parameters<OriginalDocumentBuilder<Path>['onWrite']>[0]) {
    return this.originalDocumentBuilder('firestore.document.onWrite').onWrite(
      applyMiddlewares(
        this.middleware,
        this.options('firestore.document.onWrite'),
        'firestore.document.onWrite',
        handler as any
      )
    );
  }

  onUpdate(handler: Parameters<OriginalDocumentBuilder<Path>['onUpdate']>[0]) {
    return this.originalDocumentBuilder('firestore.document.onUpdate').onUpdate(
      applyMiddlewares(
        this.middleware,
        this.options('firestore.document.onUpdate'),
        'firestore.document.onUpdate',
        handler as any
      )
    );
  }

  onCreate(handler: Parameters<OriginalDocumentBuilder<Path>['onCreate']>[0]) {
    return this.originalDocumentBuilder('firestore.document.onCreate').onCreate(
      applyMiddlewares(
        this.middleware,
        this.options('firestore.document.onCreate'),
        'firestore.document.onCreate',
        handler as any
      )
    );
  }

  onDelete(handler: Parameters<OriginalDocumentBuilder<Path>['onDelete']>[0]) {
    return this.originalDocumentBuilder('firestore.document.onDelete').onDelete(
      applyMiddlewares(
        this.middleware,
        this.options('firestore.document.onDelete'),
        'firestore.document.onDelete',
        handler as any
      )
    );
  }
}

export class AnalyticsEventBuilder {
  constructor(
    private originalAnalyticsEventBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalAnalyticsEventBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onLog(handler: Parameters<OriginalAnalyticsEventBuilder['onLog']>[0]) {
    return this.originalAnalyticsEventBuilder('analytics.event.onLog').onLog(
      applyMiddlewares(
        this.middleware,
        this.options('analytics.event.onLog'),
        'analytics.event.onLog',
        handler
      )
    );
  }
}

export class BucketBuilder {
  constructor(
    private originalBucketBuilderBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalBucketBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  object() {
    return new ObjectBuilder(
      (functionType: keyof FunctionsHandlers) =>
        this.originalBucketBuilderBuilder(functionType).object(),
      this.options,
      this.middleware
    );
  }
}

export class ObjectBuilder {
  constructor(
    private originalObjectBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalObjectBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onArchive(handler: Parameters<OriginalObjectBuilder['onArchive']>[0]) {
    return this.originalObjectBuilder('storage.object.onArchive').onArchive(
      applyMiddlewares(
        this.middleware,
        this.options('storage.object.onArchive'),
        'storage.object.onArchive',
        handler
      )
    );
  }

  onDelete(handler: Parameters<OriginalObjectBuilder['onDelete']>[0]) {
    return this.originalObjectBuilder('storage.object.onDelete').onDelete(
      applyMiddlewares(
        this.middleware,
        this.options('storage.object.onDelete'),
        'storage.object.onDelete',
        handler
      )
    );
  }

  onFinalize(handler: Parameters<OriginalObjectBuilder['onFinalize']>[0]) {
    return this.originalObjectBuilder('storage.object.onFinalize').onFinalize(
      applyMiddlewares(
        this.middleware,
        this.options('storage.object.onFinalize'),
        'storage.object.onFinalize',
        handler
      )
    );
  }

  onMetadataUpdate(
    handler: Parameters<OriginalObjectBuilder['onMetadataUpdate']>[0]
  ) {
    return this.originalObjectBuilder(
      'storage.object.onMetadataUpdate'
    ).onMetadataUpdate(
      applyMiddlewares(
        this.middleware,
        this.options('storage.object.onMetadataUpdate'),
        'storage.object.onMetadataUpdate',
        handler
      )
    );
  }
}

export class TopicBuilder {
  constructor(
    private originalTopicBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalTopicBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onPublish(handler: Parameters<OriginalTopicBuilder['onPublish']>[0]) {
    return this.originalTopicBuilder('pubsub.topic.onPublish').onPublish(
      applyMiddlewares(
        this.middleware,
        this.options('pubsub.topic.onPublish'),
        'pubsub.topic.onPublish',
        handler
      )
    );
  }
}

export class ScheduleBuilder {
  private _config: ScheduleRetryConfig | undefined = undefined;
  private _timeZone: string | undefined = undefined;

  constructor(
    private originalScheduleBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalScheduleBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  retryConfig(config: ScheduleRetryConfig): ScheduleBuilder {
    this._config = {
      ...(this._config ?? {}),
      ...config,
    };
    return this;
  }

  timeZone(timeZone: string): ScheduleBuilder {
    this._timeZone = timeZone;
    return this;
  }

  private apply(builder: OriginalScheduleBuilder) {
    if (this._config) {
      builder.retryConfig(this._config);
    }
    if (this._timeZone != null) {
      builder.timeZone(this._timeZone);
    }
    return builder;
  }

  onRun(handler: Parameters<OriginalScheduleBuilder['onRun']>[0]) {
    return this.apply(
      this.originalScheduleBuilder('pubsub.schedule.onRun')
    ).onRun(
      applyMiddlewares(
        this.middleware,
        this.options('pubsub.schedule.onRun'),
        'pubsub.schedule.onRun',
        handler
      )
    );
  }
}

export class UserBuilder {
  constructor(
    private originalUserBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalUserBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onCreate(handler: Parameters<OriginalUserBuilder['onCreate']>[0]) {
    return this.originalUserBuilder('auth.user.onCreate').onCreate(
      applyMiddlewares(
        this.middleware,
        this.options('auth.user.onCreate'),
        'auth.user.onCreate',
        handler
      )
    );
  }

  onDelete(handler: Parameters<OriginalUserBuilder['onDelete']>[0]) {
    return this.originalUserBuilder('auth.user.onDelete').onDelete(
      applyMiddlewares(
        this.middleware,
        this.options('auth.user.onDelete'),
        'auth.user.onDelete',
        handler
      )
    );
  }

  beforeCreate(handler: Parameters<OriginalUserBuilder['beforeCreate']>[0]) {
    return this.originalUserBuilder('auth.user.beforeCreate').beforeCreate(
      applyMiddlewares(
        this.middleware,
        this.options('auth.user.beforeCreate'),
        'auth.user.beforeCreate',
        handler
      )
    );
  }

  beforeSignIn(handler: Parameters<OriginalUserBuilder['beforeSignIn']>[0]) {
    return this.originalUserBuilder('auth.user.beforeSignIn').beforeSignIn(
      applyMiddlewares(
        this.middleware,
        this.options('auth.user.beforeSignIn'),
        'auth.user.beforeSignIn',
        handler
      )
    );
  }
}

export class TestMatrixBuilder {
  constructor(
    private originalTestMatrixBuilder: (
      functionType: keyof FunctionsHandlers
    ) => OriginalTestMatrixBuilder,
    private options: (
      functionType: keyof FunctionsHandlers
    ) => DeploymentOptions,
    private middleware: Middleware
  ) {}

  onComplete(handler: Parameters<OriginalTestMatrixBuilder['onComplete']>[0]) {
    return this.originalTestMatrixBuilder(
      'testlab.testmatrix.onComplete'
    ).onComplete(
      applyMiddlewares(
        this.middleware,
        this.options('testlab.testmatrix.onComplete'),
        'testlab.testmatrix.onComplete',
        handler
      )
    );
  }
}

export * from './middlewares';
