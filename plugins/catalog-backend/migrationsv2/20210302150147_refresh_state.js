/*
 * Copyright 2020 Spotify AB
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

// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('refresh_state', table => {
    table.comment(
      'Location refresh states. Every individual location (that was ever directly or indirectly discovered) and entity has an entry in this table. It therefore represents the entire live set of things that the refresh loop considers.',
    );
    table
      .text('entity_id')
      .primary()
      .notNullable()
      .comment(
        'Primary ID, which will also be used as the uid of the resulting entity',
      );
    table
      .text('entity_ref')
      .unique()
      .notNullable()
      .comment('A reference to the entity that the refresh state is tied to');
    table
      .text('unprocessed_entity')
      .notNullable()
      .comment(
        'The unprocessed entity (in its source form, before being run through all of the processors) as JSON',
      );
    table
      .text('processed_entity')
      .nullable()
      .comment(
        'The processed entity (after running through all processors, but before being stitched together with state and relations) as JSON',
      );
    table
      .text('cache')
      .nullable()
      .comment(
        'Cache information tied to the refreshing of this entity, such as etag information or actual response caching',
      );
    table
      .text('errors')
      .notNullable()
      .comment('JSON array containing all errors related to entity');
    table
      .dateTime('next_update_at') // TOOD: timezone or change to epoch-millis or similar
      .notNullable()
      .comment('Timestamp of when entity should be updated');
    table
      .dateTime('last_discovery_at') // TOOD: timezone or change to epoch-millis or similar
      .notNullable()
      .comment('The last timestamp of which this entity was discovered');
    table.index('entity_id', 'refresh_state_entity_id_idx');
    table.index('entity_ref', 'refresh_state_entity_ref_idx');
    table.index('next_update_at', 'refresh_state_next_update_at_idx');
  });

  await knex.schema.createTable('final_entities', table => {
    table.comment(
      'This table contains the final entity result after processing and stitching',
    );
    table
      .text('entity_id')
      .primary()
      .notNullable()
      .references('entity_id')
      .inTable('refresh_state')
      .onDelete('CASCADE')
      .comment(
        'Entity ID which correspond to the ID in the refresh_state table',
      );
    table.text('etag').notNullable().comment('Etag to be used for caching');
    table.text('finalized_entity').notNullable().comment('The final entity');
    table.index('entity_id', 'final_entities_entity_id_idx');
  });

  await knex.schema.createTable('refresh_state_references', table => {
    table.comment(
      'Holds edges between refresh state rows. Every time when an entity is processed and emits another entity, an edge will be stored to represent that fact. This is used to detect orphans and ultimately deletions.',
    );
    table
      .increments('id')
      .comment('Primary key to distinguish unique lines from each other');
    table
      .text('source_key')
      .nullable()
      .comment(
        'When the reference source is not an entity, this is an opaque identifier for that source.',
      );
    table
      .text('source_entity_ref')
      .nullable()
      .references('entity_ref')
      .inTable('refresh_state')
      .onDelete('CASCADE')
      .comment(
        'When the reference source is an entity, this is the EntityRef of the source entity.',
      );
    table
      .text('target_entity_ref')
      .notNullable()
      .references('entity_ref')
      .inTable('refresh_state')
      .onDelete('CASCADE')
      .comment('The EntityRef of the target entity.');
    table.index('source_key', 'refresh_state_references_source_key_idx');
    table.index(
      'source_entity_ref',
      'refresh_state_references_source_entity_ref_idx',
    );
    table.index(
      'target_entity_ref',
      'refresh_state_references_target_entity_ref_idx',
    );
  });

  await knex.schema.createTable('relations', table => {
    table.comment('All relations between entities in the catalog');
    table
      .text('originating_entity_id')
      .references('entity_id')
      .inTable('refresh_state')
      .onDelete('CASCADE')
      .notNullable()
      .comment('The entity that provided the relation');
    table
      .text('source_entity_ref')
      .notNullable()
      .comment('The entity reference of the source entity of the relation');
    table
      .text('type')
      .notNullable()
      .comment('The type of the relation between the entities');
    table
      .text('target_entity_ref')
      .notNullable()
      .comment('The entity reference of the target entity of the relation');
    table.index('source_entity_ref', 'relations_source_entity_ref_idx');
    table.index('originating_entity_id', 'relations_source_entity_id_idx');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('refresh_state_references', table => {
    table.dropIndex([], 'refresh_state_references_source_special_key_idx');
    table.dropIndex([], 'refresh_state_references_source_entity_id_idx');
    table.dropIndex([], 'refresh_state_references_target_entity_id_idx');
  });
  await knex.schema.alterTable('refresh_state', table => {
    table.dropIndex([], 'refresh_state_entity_id_idx');
    table.dropIndex([], 'refresh_state_entity_ref_idx');
    table.dropIndex([], 'refresh_state_next_update_at_idx');
  });
  await knex.schema.alterTable('final_entities', table => {
    table.dropIndex([], 'final_entities_entity_id_idx');
  });
  await knex.schema.alterTable('relations', table => {
    table.index('source_entity_ref', 'relations_source_entity_ref_idx');
    table.index('originating_entity_id', 'relations_source_entity_id_idx');
  });
  await knex.schema.dropTable('final_entities');
  await knex.schema.dropTable('relations');
  await knex.schema.dropTable('references');
  await knex.schema.dropTable('refresh_state');
};
