## Description

A faucet API for the Ethereum blockchain. This API is used to send Ether or an ERC20 token to a given address.

## Installation

```bash
$ npm install
```

## Configuration

Fill in the [configuration file](src/config/configuration.ts) with the required values.

> You will need to create a `.env` file in the root folder.

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
# or with pm2
$ npm run start:pm2
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Endpoints

### Request tokens

Sample request body:

```json
{
    "tokens": ["eth", "ovl"],
    "recipient": "0xaf7F476a8C72de272Fc9A4b6153BB1B8Caa843bF"
}
```

Sample [partial] success response:

```json
{
    "eth": {
        "status": "success",
        "txHash": "0xba129d4acbaf55ccc634edc2b1ac8f677add0ddfe4a1f799fda699ad73afa29f"
    },
    "ovl": {
        "status": "error",
        "reason": "could not transfer token (ovl) to recipient"
    }
}
```

Sample response when there's the request body is invalid:

```json
{
    "message": [
        "each value in tokens must be one of the following values: eth, ovl",
        "invalid recipient address (0xaf7F476a8C72de272Fc9A4b6153BB1B8Caa843b)"
    ],
    "error": "Bad Request",
    "statusCode": 400
}
```

Sample response when there's an error with the request:

```json
{
    "message": "recipient has already claimed token (ovl)",
    "error": "Bad Request",
    "statusCode": 400
}
```
