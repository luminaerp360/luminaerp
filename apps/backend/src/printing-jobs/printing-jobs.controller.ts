// printing-jobs.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { PrintingJobsService } from './printing-jobs.service';
import { JwtGuard } from 'src/auth/guard';
import { PrintingJobDto } from './dto/create-printing-job.dto';
import { UpdatePrintingJobDto } from './dto/update-printing-job.dto';

@Controller('organizations/:organizationId/printing-jobs')
// @UseGuards(JwtGuard)
export class PrintingJobsController {
  constructor(private readonly printingJobsService: PrintingJobsService) {}

  @Post()
  async createPrintingJob(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: PrintingJobDto,
  ) {
    return this.printingJobsService.createPrintingJob(organizationId, dto);
  }

  @Get()
  async getAllPrintingJobs(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.printingJobsService.getAllPrintingJobs(organizationId);
  }

  @Put(':id/status')
  async updatePrintingJobStatus(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrintingJobDto,
  ) {
    return this.printingJobsService.updatePrintingJobStatus(organizationId, id, dto);
  }
}