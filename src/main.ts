import { NestFactory } from "@nestjs/core"
import { ConfigService } from "@nestjs/config"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Enable CORS. Ref: https://docs.nestjs.com/security/cors
  app.enableCors({
    origin: "https://app.overlay.market",
    credentials: true,
  })
  // Enable dto validation. Ref: https://docs.nestjs.com/techniques/validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }))
  // Enable custom configuration. Ref: https://docs.nestjs.com/techniques/configuration
  const configService = app.get(ConfigService)
  const port = configService.get("port")
  await app.listen(port)
}

bootstrap()
