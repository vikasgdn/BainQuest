import type { ContentMetadataRepository } from '../../../domain/repositories/contracts';
import type { ContentMetadata } from '../../../domain/models/types';
import type { DatabaseExecutor } from '../DatabaseDriver';
import { instantToEpoch, metadataFromRow } from '../mappers';

export class ContentMetadataSqlRepository implements ContentMetadataRepository {
  constructor(private readonly database: DatabaseExecutor) {}
  async get(key: string): Promise<ContentMetadata | null> {
    const rows = await this.database.query(
      'SELECT * FROM content_metadata WHERE content_key = ?',
      [key],
    );
    return rows[0] ? metadataFromRow(rows[0]) : null;
  }
  async put(metadata: ContentMetadata): Promise<void> {
    await this.database.execute(
      `INSERT INTO content_metadata (content_key, schema_version, content_version, checksum, imported_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(content_key) DO UPDATE SET schema_version=excluded.schema_version, content_version=excluded.content_version, checksum=excluded.checksum, imported_at=excluded.imported_at`,
      [
        metadata.key,
        metadata.schemaVersion,
        metadata.contentVersion,
        metadata.checksum,
        instantToEpoch(metadata.importedAt),
      ],
    );
  }
}
