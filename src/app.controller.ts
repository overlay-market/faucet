import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common"
import { AppService } from "./app.service"
import { RequestTokenDto } from "./app.dto"

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post()
  async requestToken(@Body() requestTokenDto: RequestTokenDto) {
    try {
      return await this.appService.requestToken(
        requestTokenDto.tokens,
        requestTokenDto.chains,
        requestTokenDto.recipient,
      )
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  @Get("claims")
  getClaimed(
    @Query("chain") chain: string,
    @Query("recipient") recipient: string,
  ) {
    return this.appService.getClaimed(chain, recipient)
  }
}
