import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common"
import { AppService } from "./app.service"
import { RequestTokenDto } from "./app.dto"

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post()
  async requestToken(@Body() requestTokenDto: RequestTokenDto) {
    try {
      return await this.appService.requestToken(
        requestTokenDto.tokens,
        requestTokenDto.recipient
      )
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
}
