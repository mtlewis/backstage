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
// import { DefaultProcessingDatabase } from './DefaultProcessingDatabase';
import { DatabaseManager } from './DatabaseManager';
import { Knex } from 'knex';
import {
  DbRefreshStateReferencesRow,
  DbRefreshStateRow,
  DefaultProcessingDatabase,
} from './DefaultProcessingDatabase';

import { Entity } from '@backstage/catalog-model';
import * as uuid from 'uuid';
import { getVoidLogger } from '@backstage/backend-common';

describe('Default Processing Database', () => {
  let db: Knex | undefined;
  let processingDatabase: DefaultProcessingDatabase | undefined;

  const logger = getVoidLogger();

  beforeEach(async () => {
    db = await DatabaseManager.createTestDatabaseConnection();
    await DatabaseManager.createDatabase(db);

    processingDatabase = new DefaultProcessingDatabase(db!, logger);
  });

  describe('replaceUnprocessedEntities', () => {
    const insertRefRow = async (ref: DbRefreshStateReferencesRow) => {
      return db!<DbRefreshStateReferencesRow>(
        'refresh_state_references',
      ).insert(ref);
    };

    const insertRefreshStateRow = async (ref: DbRefreshStateRow) => {
      await db!<DbRefreshStateRow>('refresh_state').insert(ref);
    };

    const createLocations = async (entityRefs: string[]) => {
      for (const ref of entityRefs) {
        await insertRefreshStateRow({
          entity_id: uuid.v4(),
          entity_ref: ref,
          unprocessed_entity: '{}',
          processed_entity: '{}',
          errors: '',
          next_update_at: 'now()',
          last_discovery_at: 'now()',
        });
      }
    };

    it('replaces all existing state correctly for simple dependency chains', async () => {
      /*
        config -> location:default/root -> location:default/root-1 -> location:default/root-2
        database -> location:default/second -> location:default/root-2
      */
      await createLocations([
        'location:default/root',
        'location:default/root-1',
        'location:default/root-2',
        'location:default/second',
      ]);

      await insertRefRow({
        source_key: 'config',
        target_entity_ref: 'location:default/root',
      });

      await insertRefRow({
        source_key: 'database',
        target_entity_ref: 'location:default/second',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root',
        target_entity_ref: 'location:default/root-1',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root-1',
        target_entity_ref: 'location:default/root-2',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/second',
        target_entity_ref: 'location:default/root-2',
      });

      await processingDatabase!.transaction(async tx => {
        await processingDatabase!.replaceUnprocessedEntities(tx, {
          type: 'full',
          sourceKey: 'config',
          items: [
            {
              apiVersion: '1.0.0',
              metadata: {
                name: 'new-root',
              },
              kind: 'Location',
            } as Entity,
          ],
        });
      });

      const currentRefreshState = await db!<DbRefreshStateRow>(
        'refresh_state',
      ).select();

      const currentRefRowState = await db!<DbRefreshStateReferencesRow>(
        'refresh_state_references',
      ).select();

      for (const ref of ['location:default/root', 'location:default/root-1']) {
        expect(currentRefreshState.some(t => t.entity_ref === ref)).toBeFalsy();
      }

      expect(
        currentRefreshState.some(
          t => t.entity_ref === 'location:default/new-root',
        ),
      ).toBeTruthy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root' &&
            t.target_entity_ref === 'location:default/root-1',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root-1' &&
            t.target_entity_ref === 'location:default/root-2',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.target_entity_ref === 'location:default/root-1' &&
            t.source_key === 'config',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.target_entity_ref === 'location:default/new-root' &&
            t.source_key === 'config',
        ),
      ).toBeTruthy();
    });

    it('should work for more complex chains', async () => {
      /*
        config -> location:default/root -> location:default/root-1 -> location:default/root-2
        config -> location:default/root -> location:default/root-1a -> location:default/root-2
      */
      await createLocations([
        'location:default/root',
        'location:default/root-1',
        'location:default/root-2',
        'location:default/root-1a',
      ]);

      await insertRefRow({
        source_key: 'config',
        target_entity_ref: 'location:default/root',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root',
        target_entity_ref: 'location:default/root-1',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root',
        target_entity_ref: 'location:default/root-1a',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root-1',
        target_entity_ref: 'location:default/root-2',
      });

      await insertRefRow({
        source_entity_ref: 'location:default/root-1a',
        target_entity_ref: 'location:default/root-2',
      });

      await processingDatabase!.transaction(async tx => {
        await processingDatabase!.replaceUnprocessedEntities(tx, {
          type: 'full',
          sourceKey: 'config',
          items: [
            {
              apiVersion: '1.0.0',
              metadata: {
                name: 'new-root',
              },
              kind: 'Location',
            } as Entity,
          ],
        });
      });

      const currentRefreshState = await db!<DbRefreshStateRow>(
        'refresh_state',
      ).select();

      const currentRefRowState = await db!<DbRefreshStateReferencesRow>(
        'refresh_state_references',
      ).select();

      const deletedRefs = [
        'location:default/root',
        'location:default/root-1',
        'location:default/root-1a',
        'location:default/root-2',
      ];

      for (const ref of deletedRefs) {
        expect(currentRefreshState.some(t => t.entity_ref === ref)).toBeFalsy();
      }

      expect(
        currentRefreshState.some(
          t => t.entity_ref === 'location:default/new-root',
        ),
      ).toBeTruthy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_key === 'config' &&
            t.target_entity_ref === 'location:default/new-root',
        ),
      ).toBeTruthy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_key === 'config' &&
            t.target_entity_ref === 'location:default/root',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root' &&
            t.target_entity_ref === 'location:default/root-1',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root' &&
            t.target_entity_ref === 'location:default/root-1a',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root-1' &&
            t.target_entity_ref === 'location:default/root-2',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_entity_ref === 'location:default/root-1a' &&
            t.target_entity_ref === 'location:default/root-2',
        ),
      ).toBeFalsy();
    });

    it('should add new locations using the delta options', async () => {
      await processingDatabase!.transaction(async tx => {
        await processingDatabase!.replaceUnprocessedEntities(tx, {
          type: 'delta',
          sourceKey: 'lols',
          removed: [],
          added: [
            {
              apiVersion: '1.0.0',
              metadata: {
                name: 'new-root',
              },
              kind: 'Location',
            } as Entity,
          ],
        });
      });

      const currentRefreshState = await db!<DbRefreshStateRow>(
        'refresh_state',
      ).select();

      const currentRefRowState = await db!<DbRefreshStateReferencesRow>(
        'refresh_state_references',
      ).select();

      expect(
        currentRefreshState.some(
          t => t.entity_ref === 'location:default/new-root',
        ),
      ).toBeTruthy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_key === 'lols' &&
            t.target_entity_ref === 'location:default/new-root',
        ),
      ).toBeTruthy();
    });

    it('should remove old locations using the delta options', async () => {
      await createLocations(['location:default/new-root']);

      await insertRefRow({
        source_key: 'lols',
        target_entity_ref: 'location:default/new-root',
      });

      await processingDatabase!.transaction(async tx => {
        await processingDatabase!.replaceUnprocessedEntities(tx, {
          type: 'delta',
          sourceKey: 'lols',
          added: [],
          removed: [
            {
              apiVersion: '1.0.0',
              metadata: {
                name: 'new-root',
              },
              kind: 'Location',
            } as Entity,
          ],
        });
      });

      const currentRefreshState = await db!<DbRefreshStateRow>(
        'refresh_state',
      ).select();

      const currentRefRowState = await db!<DbRefreshStateReferencesRow>(
        'refresh_state_references',
      ).select();

      expect(
        currentRefreshState.some(
          t => t.entity_ref === 'location:default/new-root',
        ),
      ).toBeFalsy();

      expect(
        currentRefRowState.some(
          t =>
            t.source_key === 'lols' &&
            t.target_entity_ref === 'location:default/new-root',
        ),
      ).toBeFalsy();
    });
  });
});
