import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'healthcare-events',
      timestamp: new Date().toISOString(),
    };
  }
}
