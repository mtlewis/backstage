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
import { EntitiesSearchFilter } from '@backstage/plugin-catalog-backend';
import { SerializableFilterFactory } from '@backstage/permission-common';
import { Entity } from '../../entity';

export const hasAnnotation: SerializableFilterFactory<
  [string],
  Entity,
  EntitiesSearchFilter
> = (annotation: string) => ({
  apply: (resource: Entity) =>
    !!resource.metadata.annotations?.hasOwnProperty(annotation),

  serialize: () => ({
    key: annotation,
    matchValueExists: true,
  }),
});
