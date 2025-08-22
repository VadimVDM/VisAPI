export * from './logging.interceptor';
export * from './transform.interceptor';
export * from './timeout.interceptor';

import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';

export const Interceptors = [
  LoggingInterceptor,
  TransformInterceptor,
  TimeoutInterceptor,
];