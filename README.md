# Firestore Data Extractor

Production-quality Node.js CLI tool to export **all** Firebase Firestore data — including deeply nested subcollections — into local JSON files. No Firebase CLI, no gcloud, no Google Cloud Storage required.

---

## Features

- 🔥 **Full recursive export** — root collections → documents → subcollections → documents (infinite depth)
- 📦 **Single file or split mode** — one `firestore-export.json` or one file per root collection
- 📊 **Progress logging** — real-time progress with collection/document counts and elapsed time
- 🛡️ **Large dataset safe** — cursor-based pagination with configurable batch sizes
- ⚡ **Atomic writes** — files are written to a temp path first, then renamed to prevent corruption
- 🔒 **Secure** — uses local service account key file, no hardcoded secrets
- 🎯 **Selective export** — optionally export only specific collections
- 📋 **Type preservation** — Firestore Timestamps, GeoPoints, References, and Bytes are serialized with type tags for lossless round-tripping

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your service account key

Download your Firebase service account key from the [Firebase Console](https://console.firebase.google.com/):

> **Project Settings** → **Service Accounts** → **Generate New Private Key**

Save it as `serviceAccountKey.json` in the project root.

### 3. Run the export

```bash
# Default: single file export
node export.js

# Split into one file per root collection
node export.js --split-collections

# Custom output directory
node export.js --output ./my-backup

# Export only specific collections
node export.js --collections users orders products

# Verbose logging (shows every document path)
node export.js --verbose
```

---

## CLI Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--service-account` | `--sa` | `./serviceAccountKey.json` | Path to service account JSON key |
| `--output` | `-o` | `./exports` | Output directory |
| `--single-file` | — | `false` | Export all data into one JSON file |
| `--split-collections` | — | `false` | Export each root collection separately |
| `--batch-size` | — | `300` | Documents per Firestore query batch |
| `--collections` | `-c` | `[]` (all) | Specific root collections to export |
| `--pretty` | — | `true` | Pretty-print JSON output |
| `--verbose` | `-v` | `false` | Show detailed per-document logging |
| `--help` | `-h` | — | Show help |

---

## Output Structure

### Single File Mode (default)

```
exports/
  └── firestore-export.json
```

### Split Collections Mode

```
exports/
  ├── _manifest.json        # Lists all exported collections
  ├── users.json
  ├── orders.json
  └── products.json
```

### JSON Schema

Each document in the export follows this structure:

```json
{
  "__id__": "abc123",
  "__path__": "users/abc123",
  "__data__": {
    "name": "John Doe",
    "createdAt": {
      "_type": "timestamp",
      "_value": "2024-01-15T10:30:00.000Z",
      "_seconds": 1705312200,
      "_nanoseconds": 0
    },
    "location": {
      "_type": "geopoint",
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "__subcollections__": {
    "orders": {
      "__collectionId__": "orders",
      "__path__": "users/abc123/orders",
      "__documents__": [ ... ]
    }
  }
}
```

### Special Type Serialization

| Firestore Type | JSON Representation |
|---------------|-------------------|
| `Timestamp` | `{ _type: "timestamp", _value: "ISO string", _seconds, _nanoseconds }` |
| `GeoPoint` | `{ _type: "geopoint", latitude, longitude }` |
| `DocumentReference` | `{ _type: "reference", _path: "collection/doc" }` |
| `Bytes` | `{ _type: "bytes", _value: "base64 string" }` |

---

## Project Structure

```
firestore-data-extractor/
├── export.js              # Main entry point (CLI)
├── package.json           # Dependencies & scripts
├── README.md              # This file
├── serviceAccountKey.json # Your Firebase key (gitignored)
├── src/
│   ├── config.js          # CLI argument parsing
│   ├── firestore.js       # Firebase Admin SDK initialization
│   ├── exporter.js        # Recursive collection/document exporter
│   ├── serializer.js      # Firestore type → JSON serialization
│   ├── logger.js          # Colored progress logging
│   └── writer.js          # Atomic JSON file writing
└── exports/               # Default output directory (created automatically)
```

---

## Performance Notes

- **Batch size**: The default of 300 works well for most databases. Increase to 500+ for simple documents, decrease to 100 for documents with many subcollections.
- **Memory**: The tool loads all data into memory before writing. For databases larger than ~1 GB, consider using `--split-collections` to reduce peak memory usage.
- **Rate limits**: Firestore allows 50,000 reads per second. The sequential traversal pattern stays well within limits for most databases.

---

## Security

- ⚠️ **Never commit `serviceAccountKey.json` to version control**
- The `.gitignore` file excludes it by default
- The service account only needs **read** permissions (Cloud Datastore Viewer role is sufficient)

---

## License

MIT
