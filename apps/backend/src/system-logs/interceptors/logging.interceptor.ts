import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SystemLogsService } from '../system-logs.service';
import { LOG_ACTIVITY_KEY, LogActivityMetadata } from '../decorators/log-activity.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly systemLogsService: SystemLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logMetadata = this.reflector.get<LogActivityMetadata>(
      LOG_ACTIVITY_KEY,
      context.getHandler(),
    );

    if (!logMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes JWT guard sets user
    const organizationId = parseInt(request.params.organizationId);

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            // Extract entity ID from response if available
            let entityId: number | undefined;
            if (data && typeof data === 'object') {
              entityId = data.id || data.data?.id;
            }

            await this.systemLogsService.createLog(organizationId, {
              userId: user?.id,
              action: logMetadata.action,
              module: logMetadata.module,
              description: logMetadata.description,
              entityType: logMetadata.entityType,
              entityId,
              ipAddress: request.ip || request.socket.remoteAddress,
              userAgent: request.headers['user-agent'],
            });
          } catch (error) {
            // Silent fail - don't break the request if logging fails
            console.error('Failed to log activity:', error);
          }
        },
      }),
    );
  }
}
