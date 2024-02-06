import { Body, Controller, Get, Post } from "@nestjs/common"
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
    return this.appService.requestToken(
      requestTokenDto.token,
      requestTokenDto.recipient
    )
  }
}
