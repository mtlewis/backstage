/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Permission, ResourcePermission } from './permission';

/**
 * A request with a UUID identifier, so that batched responses can be matched up with the original
 * requests.
 * @public
 */
export type Identified<T> = T & { id: string };

/**
 * A batch of request or response items used in {@link PermissionClient} methods.
 * @public
 */
export type Batch<T> = {
  items: Identified<T>[];
};

/**
 * The result of an authorization request.
 * @public
 */
export enum AuthorizeResult {
  /**
   * The authorization request is denied.
   */
  DENY = 'DENY',
  /**
   * The authorization request is allowed.
   */
  ALLOW = 'ALLOW',
  /**
   * The authorization request is allowed if the provided conditions are met.
   */
  CONDITIONAL = 'CONDITIONAL',
}

/**
 * An individual request for {@link PermissionClient#authorize}.
 * @public
 */
export type AuthorizeQuery =
  | {
      permission: Exclude<Permission, ResourcePermission>;
      // Prohibit resourceRefs for non-resource permissions to
      // avoid accidental misuse of authorization APIs.
      resourceRef?: never;
    }
  | { permission: ResourcePermission; resourceRef: string };

/**
 * An individual response from {@link PermissionClient#authorize}.
 * @public
 */
export type AuthorizeDecision = {
  result: AuthorizeResult.ALLOW | AuthorizeResult.DENY;
};

/**
 * A condition returned with a CONDITIONAL authorization response.
 *
 * Conditions are a reference to a rule defined by a plugin, and parameters to apply the rule. For
 * example, a rule might be `isOwner` from the catalog-backend, and params may be a list of entity
 * claims from a identity token.
 * @public
 */
export type PermissionCondition<TParams extends unknown[] = unknown[]> = {
  rule: string;
  params: TParams;
};

/**
 * Utility type to represent an array with 1 or more elements.
 * @ignore
 */
type NonEmptyArray<T> = [T, ...T[]];

/**
 * Represnts a logical AND for the provided criteria.
 * @public
 */
export type AllOfCriteria<TQuery> = {
  allOf: NonEmptyArray<PermissionCriteria<TQuery>>;
};

/**
 * Represnts a logical OR for the provided criteria.
 * @public
 */
export type AnyOfCriteria<TQuery> = {
  anyOf: NonEmptyArray<PermissionCriteria<TQuery>>;
};

/**
 * Represents a negation of the provided criteria.
 * @public
 */
export type NotCriteria<TQuery> = {
  not: PermissionCriteria<TQuery>;
};

/**
 * Composes several {@link PermissionCondition}s as criteria with a nested AND/OR structure.
 * @public
 */
export type PermissionCriteria<TQuery> =
  | AllOfCriteria<TQuery>
  | AnyOfCriteria<TQuery>
  | NotCriteria<TQuery>
  | TQuery;

/**
 * An individual request for {@link PermissionClient#fetchConditionalDecision}.
 * @public
 */
export type FetchConditionalDecisionQuery = {
  permission: ResourcePermission;
  resourceRef?: never;
};

/**
 * An individual response for {@link PermissionClient#fetchConditionalDecision}.
 * @public
 */
export type FetchConditionalDecisionResult =
  | { result: AuthorizeResult.ALLOW | AuthorizeResult.DENY }
  | {
      result: AuthorizeResult.CONDITIONAL;
      conditions: PermissionCriteria<PermissionCondition>;
    };
