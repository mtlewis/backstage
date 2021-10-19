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

import { Filters } from '@backstage/backend-common';
import {
  PermissionCondition,
  PermissionRule,
} from '@backstage/permission-common';
import express, { Response, Router } from 'express';
import { conditionFor } from './conditionFor';

export type ApplyConditionsRequest = {
  resourceRef: string;
  resourceType: string;
  conditions: Filters<PermissionCondition<unknown[]>>;
};

export type ApplyConditionsResponse = {
  allowed: boolean;
};

type Condition<TRule> = TRule extends PermissionRule<any, any, infer TParams>
  ? (...params: TParams) => PermissionCondition<TParams>
  : never;

type Conditions<TRules extends Record<string, PermissionRule<any, any>>> = {
  [Name in keyof TRules]: Condition<TRules[Name]>;
};

type QueryType<TRules> = TRules extends Record<
  string,
  PermissionRule<any, infer TQuery, any>
>
  ? TQuery
  : never;

export const createPermissionIntegration = <
  TResource,
  TRules extends { [key: string]: PermissionRule<TResource, any> },
  TGetResourceParams extends any[] = [],
>({
  pluginId,
  resourceType,
  rules,
  getResource,
}: {
  pluginId: string;
  resourceType: string;
  rules: TRules;
  getResource: (
    resourceRef: string,
    ...params: TGetResourceParams
  ) => Promise<TResource | undefined>;
}): {
  createPermissionIntegrationRouter: (...params: TGetResourceParams) => Router;
  toQuery: (
    conditions: Filters<PermissionCondition>,
  ) => Filters<QueryType<TRules>>;
  conditions: Conditions<TRules>;
  createConditions: (conditions: Filters<PermissionCondition>) => {
    pluginId: string;
    resourceType: string;
    conditions: Filters<PermissionCondition>;
  };
  registerPermissionRule: (
    rule: PermissionRule<TResource, QueryType<TRules>>,
  ) => void;
} => {
  const rulesMap = new Map(Object.values(rules).map(rule => [rule.name, rule]));

  const getRule = (
    name: string,
  ): PermissionRule<TResource, QueryType<TRules>> => {
    const rule = rulesMap.get(name);

    if (!rule) {
      throw new Error(`Unexpected permission rule: ${name}`);
    }

    return rule;
  };

  return {
    createPermissionIntegrationRouter: (
      ...getResourceParams: TGetResourceParams
    ) => {
      const router = Router();

      router.use('/permissions/', express.json());

      router.post(
        '/permissions/apply-conditions',
        async (req, res: Response<ApplyConditionsResponse>) => {
          // TODO(authorization-framework): validate input
          const body = req.body as ApplyConditionsRequest;

          if (body.resourceType !== resourceType) {
            throw new Error(`Unexpected resource type: ${body.resourceType}`);
          }

          const resource = await getResource(
            body.resourceRef,
            ...getResourceParams,
          );

          if (!resource) {
            return res.status(400).end();
          }

          const allowed = body.conditions.anyOf.some(({ allOf }) =>
            allOf.every(({ rule, params }) =>
              getRule(rule).apply(resource, ...params),
            ),
          );

          return res.status(200).json({ allowed });
        },
      );

      return router;
    },
    toQuery: (
      conditions: Filters<PermissionCondition>,
    ): Filters<QueryType<TRules>> => ({
      anyOf: conditions.anyOf.map(({ allOf }) => ({
        allOf: allOf.map(({ rule, params }) =>
          getRule(rule).toQuery(...params),
        ),
      })),
    }),
    conditions: Object.entries(rules).reduce(
      (acc, [key, rule]) => ({
        ...acc,
        [key]: conditionFor(rule),
      }),
      {} as Conditions<TRules>,
    ),
    createConditions: (conditions: Filters<PermissionCondition>) => ({
      pluginId,
      resourceType,
      conditions,
    }),
    registerPermissionRule: rule => {
      rulesMap.set(rule.name, rule);
    },
  };
};
