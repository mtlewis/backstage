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

import {
  PluginEndpointDiscovery,
  TokenManager,
} from '@backstage/backend-common';
import {
  catalogEntityReadPermission,
  Entity,
  UserEntity,
} from '@backstage/catalog-model';
import { IndexableDocument, DocumentCollator } from '@backstage/search-common';
import { Config } from '@backstage/config';
import {
  CatalogApi,
  CatalogClient,
  CatalogEntitiesRequest,
} from '@backstage/catalog-client';
import {
  createConditionTransformer,
  PermissionRule,
} from '@backstage/plugin-permission-node';
import * as catalogPermissionRules from '../permissions/rules';
import { EntitiesSearchFilter } from '../catalog';
import { buildEntitySearch } from '../stitching/buildEntitySearch';

export type CatalogEntityDocument = IndexableDocument<any>;

export class DefaultCatalogCollator
  implements DocumentCollator<CatalogEntityDocument>
{
  private readonly customPermissionRules: PermissionRule<
    Entity,
    EntitiesSearchFilter
  >[];
  protected discovery: PluginEndpointDiscovery;
  protected locationTemplate: string;
  protected filter?: CatalogEntitiesRequest['filter'];
  protected readonly catalogClient: CatalogApi;
  public readonly type: string = 'software-catalog';
  protected tokenManager: TokenManager;

  static fromConfig(
    _config: Config,
    options: {
      discovery: PluginEndpointDiscovery;
      tokenManager: TokenManager;
      filter?: CatalogEntitiesRequest['filter'];
      customPermissionRules?: PermissionRule<Entity, EntitiesSearchFilter>[];
    },
  ) {
    return new DefaultCatalogCollator({
      ...options,
    });
  }

  constructor(options: {
    discovery: PluginEndpointDiscovery;
    tokenManager: TokenManager;
    locationTemplate?: string;
    filter?: CatalogEntitiesRequest['filter'];
    catalogClient?: CatalogApi;
    customPermissionRules?: PermissionRule<Entity, EntitiesSearchFilter>[];
  }) {
    const {
      discovery,
      locationTemplate,
      filter,
      catalogClient,
      tokenManager,
      customPermissionRules,
    } = options;

    this.discovery = discovery;
    this.locationTemplate =
      locationTemplate || '/catalog/:namespace/:kind/:name';
    this.filter = filter;
    this.catalogClient =
      catalogClient || new CatalogClient({ discoveryApi: discovery });
    this.tokenManager = tokenManager;
    this.customPermissionRules = customPermissionRules ?? [];
  }

  protected applyArgsToFormat(
    format: string,
    args: Record<string, string>,
  ): string {
    let formatted = format;
    for (const [key, value] of Object.entries(args)) {
      formatted = formatted.replace(`:${key}`, value);
    }
    return formatted.toLowerCase();
  }

  private isUserEntity(entity: Entity): entity is UserEntity {
    return entity.kind.toLocaleUpperCase('en-US') === 'USER';
  }

  private getDocumentText(entity: Entity): string {
    let documentText = entity.metadata.description || '';
    if (this.isUserEntity(entity)) {
      if (entity.spec?.profile?.displayName && documentText) {
        // combine displayName and description
        const displayName = entity.spec?.profile?.displayName;
        documentText = displayName.concat(' : ', documentText);
      } else {
        documentText = entity.spec?.profile?.displayName || documentText;
      }
    }
    return documentText;
  }

  documentReadPermission() {
    return catalogEntityReadPermission;
  }

  createConditionTransformer() {
    return createConditionTransformer([
      ...Object.values(catalogPermissionRules),
      ...this.customPermissionRules,
    ]);
  }

  async execute() {
    const { token } = await this.tokenManager.getToken();
    const response = await this.catalogClient.getEntities(
      {
        filter: this.filter,
      },
      { token },
    );
    return response.items.map((entity: Entity): CatalogEntityDocument => {
      const result = {
        title: entity.metadata.title ?? entity.metadata.name,
        location: this.applyArgsToFormat(this.locationTemplate, {
          namespace: entity.metadata.namespace || 'default',
          kind: entity.kind,
          name: entity.metadata.name,
        }),
        text: this.getDocumentText(entity),
        resource: buildEntitySearch('_ignored', entity).reduce(
          (acc, { key, value }) => {
            // TODO(mtlewis) figure out a workaround for this conflict -
            if (value !== null && !['true', 'false'].includes(value)) {
              acc[key] = value;
            }

            return acc;
          },
          {} as Record<string, string | null>,
        ),
      };

      return result;
    });
  }
}
