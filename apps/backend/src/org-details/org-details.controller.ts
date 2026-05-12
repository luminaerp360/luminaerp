import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { OrgDetailsService } from './org-details.service';
import { CreateOrgDetailsDto, UpdateOrgDetailsDto } from './orgDetails.dto';

@Controller('org-details')
export class OrgDetailsController {
  // constructor(private readonly orgDetailsService: OrgDetailsService) {}

  // @Post()
  // async create(@Body() createOrgDetailsDto: CreateOrgDetailsDto) {
  //   return this.orgDetailsService.create(createOrgDetailsDto);
  // }

  // @Get()
  // async findAll() {
  //   return this.orgDetailsService.findAll();
  // }

  // @Get(':id')
  // async findOne(@Param('id') id: string) {
  //   return this.orgDetailsService.findOne(+id);
  // }

  // @Put(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateOrgDetailsDto: UpdateOrgDetailsDto,
  // ) {
  //   return this.orgDetailsService.update(+id, updateOrgDetailsDto);
  // }

  // @Delete(':id')
  // async remove(@Param('id') id: string) {
  //   return this.orgDetailsService.remove(+id);
  // }
}
