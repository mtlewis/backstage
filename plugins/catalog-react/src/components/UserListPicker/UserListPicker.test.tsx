/*
 * Copyright 2021 Spotify AB
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

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Entity, RELATION_OWNED_BY } from '@backstage/catalog-model';
import { UserListPicker } from './UserListPicker';
import { MockEntityListContextProvider } from '../../testUtils/providers';
import {
  ApiProvider,
  ApiRegistry,
  ConfigApi,
  configApiRef,
} from '@backstage/core-api';

const apis = ApiRegistry.from([
  [
    configApiRef,
    ({
      getOptionalString: jest.fn(
        (key: string) =>
          ({
            'organization.name': 'Test Company',
          }[key]),
      ),
    } as unknown) as ConfigApi,
  ],
]);

jest.mock('../../hooks', () => ({
  useOwnUser: jest.fn().mockReturnValue({
    value: {
      apiVersion: '1',
      kind: 'User',
      metadata: {
        namespace: 'default',
        name: 'testUser',
      },
    },
  }),
  useStarredEntities: jest.fn().mockReturnValue({
    isStarredEntity: jest.fn(
      (entity: Entity) => entity.metadata.name === 'component-3',
    ),
  }),
  useEntityListProvider: jest.requireActual('../../hooks')
    .useEntityListProvider,
}));

describe('<UserListPicker />', () => {
  const backendEntities: Entity[] = [
    {
      apiVersion: '1',
      kind: 'Component',
      metadata: {
        namespace: 'namespace-1',
        name: 'component-1',
        tags: [],
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          target: { kind: 'User', namespace: 'default', name: 'testUser' },
        },
      ],
    },
    {
      apiVersion: '1',
      kind: 'Component',
      metadata: {
        namespace: 'namespace-2',
        name: 'component-2',
        tags: [],
      },
    },
    {
      apiVersion: '1',
      kind: 'Component',
      metadata: {
        namespace: 'namespace-2',
        name: 'component-3',
        tags: [],
      },
    },
    {
      apiVersion: '1',
      kind: 'Component',
      metadata: {
        namespace: 'namespace-2',
        name: 'component-4',
        tags: [],
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          target: { kind: 'User', namespace: 'default', name: 'testUser' },
        },
      ],
    },
  ];

  it('renders filter groups', () => {
    const { queryByText } = render(
      <ApiProvider apis={apis}>
        <MockEntityListContextProvider value={{ backendEntities }}>
          <UserListPicker />
        </MockEntityListContextProvider>
      </ApiProvider>,
    );

    expect(queryByText('Personal')).toBeInTheDocument();
    expect(queryByText('Test Company')).toBeInTheDocument();
  });

  it('renders filters', () => {
    const { getAllByRole } = render(
      <ApiProvider apis={apis}>
        <MockEntityListContextProvider value={{ backendEntities }}>
          <UserListPicker />
        </MockEntityListContextProvider>
      </ApiProvider>,
    );

    expect(
      getAllByRole('menuitem').map(({ textContent }) => textContent),
    ).toEqual(['Owned', 'Starred', 'All']);
  });

  it('includes counts alongside each filter', () => {
    const { getAllByRole } = render(
      <ApiProvider apis={apis}>
        <MockEntityListContextProvider value={{ backendEntities }}>
          <UserListPicker />
        </MockEntityListContextProvider>
      </ApiProvider>,
    );

    // Material UI renders ListItemSecondaryActions outside the
    // menuitem itself, so we pick off the next sibling.
    expect(
      getAllByRole('menuitem').map(
        ({ nextSibling }) => nextSibling?.textContent,
      ),
    ).toEqual(['2', '1', '4']);
  });

  it('updates user filter when a menuitem is selected', () => {
    const updateFilters = jest.fn();
    const { getByText } = render(
      <ApiProvider apis={apis}>
        <MockEntityListContextProvider
          value={{ backendEntities, updateFilters }}
        >
          <UserListPicker />
        </MockEntityListContextProvider>
      </ApiProvider>,
    );

    fireEvent.click(getByText('Starred'));

    expect(updateFilters).toHaveBeenCalledTimes(1);
    expect(updateFilters.mock.calls[0][0].user.value).toEqual('starred');
  });
});
