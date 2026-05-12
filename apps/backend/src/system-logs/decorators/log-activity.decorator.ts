import { SetMetadata } from '@nestjs/common';
import { LogAction, LogModule } from '../entities/system-log.entity';

export interface LogActivityMetadata {
  action: LogAction;
  module: LogModule;
  description: string;
  entityType?: string;
}

export const LOG_ACTIVITY_KEY = 'log_activity';

export const LogActivity = (metadata: LogActivityMetadata) =>
  SetMetadata(LOG_ACTIVITY_KEY, metadata);
