import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if caching is enabled for this handler
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, handler);

    if (!cacheKey) {
      return next.handle();
    }

    // Generate cache key based on request
    const key = this.generateCacheKey(cacheKey, request);

    // Try to get from cache
    const cached = await this.cacheService.get(key);
    if (cached) {
      return of(cached);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(key, response, cacheTTL);
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { method, url, query, params, body } = request;
    const keyData = {
      method,
      url,
      query,
      params,
      body: body ? JSON.stringify(body) : undefined,
    };
    return this.cacheService.generateKey(baseKey, keyData);
  }
}