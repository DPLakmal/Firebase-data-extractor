import admin from 'firebase-admin';

/**
 * Serialize Firestore field values into plain JSON-safe objects.
 *
 * Handles special Firestore types:
 * - Timestamp    → ISO 8601 string with type tag
 * - GeoPoint     → { latitude, longitude } with type tag
 * - DocumentRef  → document path string with type tag
 * - Bytes/Buffer → base64-encoded string with type tag
 * - Arrays       → recursively serialized
 * - Maps/Objects → recursively serialized
 * - Primitives   → passed through as-is
 *
 * @param {*} value - Any Firestore field value
 * @returns {*} JSON-serializable value
 */
export function serializeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Timestamp
  if (value instanceof admin.firestore.Timestamp) {
    return {
      _type: 'timestamp',
      _value: value.toDate().toISOString(),
      _seconds: value.seconds,
      _nanoseconds: value.nanoseconds,
    };
  }

  // GeoPoint
  if (value instanceof admin.firestore.GeoPoint) {
    return {
      _type: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  // Document Reference
  if (value instanceof admin.firestore.DocumentReference) {
    return {
      _type: 'reference',
      _path: value.path,
    };
  }

  // Bytes / Buffer
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      _type: 'bytes',
      _value: Buffer.from(value).toString('base64'),
    };
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  // Plain object / map
  if (typeof value === 'object' && value !== null) {
    const serialized = {};
    for (const [key, val] of Object.entries(value)) {
      serialized[key] = serializeValue(val);
    }
    return serialized;
  }

  // Primitives (string, number, boolean)
  return value;
}

/**
 * Serialize all fields of a Firestore document snapshot.
 *
 * @param {FirebaseFirestore.DocumentSnapshot} docSnapshot
 * @returns {object} Serialized document data
 */
export function serializeDocument(docSnapshot) {
  const data = docSnapshot.data();
  if (!data) return {};

  const serialized = {};
  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeValue(value);
  }
  return serialized;
}
