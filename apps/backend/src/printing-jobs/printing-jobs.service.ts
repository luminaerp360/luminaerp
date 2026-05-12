// printing-jobs.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrintingJobDto, PrintingJobStatus } from './dto/create-printing-job.dto';
import { UpdatePrintingJobDto } from './dto/update-printing-job.dto';

@Injectable()
export class PrintingJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrintingJob(organizationId: number, dto: PrintingJobDto) {
    const { type, referenceId, printerIp } = dto;

    const printingJob = await this.prisma.printingJob.create({
      data: {
        organizationId,
        type,
        referenceId,
        printerIp,
        status: PrintingJobStatus.PENDING,
      },
    });

    // TODO: Implement printing logic based on the job type (ORDER or CREDIT_SALE)

    return printingJob;
  }

  async getAllPrintingJobs(organizationId: number) {
    return this.prisma.printingJob.findMany({
      where: { organizationId },
    });
  }

  async updatePrintingJobStatus(organizationId: number, id: number, dto: UpdatePrintingJobDto) {
    const { status, failureReason } = dto;

    const printingJob = await this.prisma.printingJob.findFirst({
      where: { id, organizationId },
    });

    if (!printingJob) {
      throw new NotFoundException(`Printing job with ID ${id} not found in this organization`);
    }

    return this.prisma.printingJob.update({
      where: { id },
      data: {
        status,
        failureReason,
      },
    });
  }
}