import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  ready() {
    // Add database/redis connection checks here if needed
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
