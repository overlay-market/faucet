import { IsNotEmpty, IsIn } from "class-validator"
import { registerDecorator, ValidationOptions } from "class-validator"
import { ethers } from "ethers"

// Reference: https://www.npmjs.com/package/class-validator#custom-validation-classes
export function IsEthAddress(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isEthAddress",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return ethers.isAddress(value)
        },
        defaultMessage() {
          // $value will be replaced with the value the user sent
          return "invalid recipient address ($value)"
        },
      },
    })
  }
}

export class RequestTokenDto {
  @IsNotEmpty()
  @IsIn(["ovl", "eth"], { each: true })
  tokens: string[]

  @IsNotEmpty()
  // @IsIn(["arb-sepolia", "bartio", "imola", "bnb-testnet"], { each: true }) // Supported chains
  @IsIn(["bnb-testnet"], { each: true }) // Disabled other chains for a time being
  chains: string[]

  @IsNotEmpty()
  @IsEthAddress()
  recipient: string
}
