## API Report File for "@backstage/errors"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { JsonObject } from '@backstage/config';

// Warning: (ae-missing-release-tag) "AuthenticationError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class AuthenticationError extends CustomErrorBase {}

// Warning: (ae-missing-release-tag) "ConflictError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class ConflictError extends CustomErrorBase {}

// Warning: (ae-missing-release-tag) "CustomErrorBase" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public (undocumented)
export class CustomErrorBase extends Error {
  constructor(message?: string, cause?: Error);
  // (undocumented)
  readonly cause?: Error;
}

// Warning: (ae-missing-release-tag) "deserializeError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export function deserializeError<T extends Error = Error>(
  data: SerializedError,
): T;

// Warning: (ae-missing-release-tag) "ErrorResponse" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export type ErrorResponse = {
  error: SerializedError;
  request?: {
    method: string;
    url: string;
  };
  response: {
    statusCode: number;
  };
};

// Warning: (ae-missing-release-tag) "InputError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class InputError extends CustomErrorBase {}

// Warning: (ae-missing-release-tag) "NotAllowedError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class NotAllowedError extends CustomErrorBase {}

// Warning: (ae-missing-release-tag) "NotFoundError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class NotFoundError extends CustomErrorBase {}

// Warning: (ae-missing-release-tag) "NotModifiedError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class NotModifiedError extends CustomErrorBase {}

// Warning: (tsdoc-param-tag-missing-hyphen) The @param block should be followed by a parameter name and then a hyphen
// Warning: (ae-missing-release-tag) "parseErrorResponse" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export function parseErrorResponse(response: Response): Promise<ErrorResponse>;

// Warning: (ae-missing-release-tag) "ResponseError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export class ResponseError extends Error {
  constructor(props: {
    message: string;
    response: Response;
    data: ErrorResponse;
    cause: Error;
  });
  readonly cause: Error;
  readonly data: ErrorResponse;
  static fromResponse(response: Response): Promise<ResponseError>;
  readonly response: Response;
}

// Warning: (ae-missing-release-tag) "SerializedError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export type SerializedError = JsonObject & {
  name: string;
  message: string;
  stack?: string;
  code?: string;
};

// Warning: (tsdoc-param-tag-missing-hyphen) The @param block should be followed by a parameter name and then a hyphen
// Warning: (tsdoc-param-tag-with-invalid-name) The @param block should be followed by a valid parameter name: The identifier cannot non-word characters
// Warning: (ae-missing-release-tag) "serializeError" is exported by the package, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export function serializeError(
  error: Error,
  options?: {
    includeStack?: boolean;
  },
): SerializedError;

// (No @packageDocumentation comment for this package)
```
