---
type: concept
title: Cloud Storage & Media Attachments
summary: Direct-to-cloud asset upload architecture using signed URLs, validation rules, and media preview rendering.
related: ["tasks.md", "api-client.md"]
source_paths: ["src/services/storage.ts", "src/components/AttachmentUploader.tsx", "src/components/AttachmentChip.tsx", "tests/attachments.test.tsx"]
---
# Cloud Storage & Media Attachments

The application supports attaching images and videos directly to tasks without routing large binary payloads through the main API server. This direct-to-cloud architecture leverages Google Cloud Storage (GCS) pre-signed PUT URLs, client-side validation, drag-and-drop file ingestion, and specialized rendering components.

## Direct Upload Architecture

The upload workflow in `src/services/storage.ts` executes a three-step protocol via `uploadFileDirectly(file, onProgress)`:

```
[Browser]                          [API Backend]                   [Google Cloud Storage]
    │                                    │                                    │
    │  1. POST /assets/signed-url        │                                    │
    │  { media_type, file_extension }    │                                    │
    ├───────────────────────────────────>│                                    │
    │                                    │                                    │
    │  SignedURLResponse                 │                                    │
    │  { upload_url, gcs_path }          │                                    │
    │<───────────────────────────────────┤                                    │
    │                                    │                                    │
    │  2. HTTP PUT (binary file)         │                                    │
    ├────────────────────────────────────────────────────────────────────────>│
    │                                    │                                    │
    │  200 OK                            │                                    │
    │<────────────────────────────────────────────────────────────────────────┤
    │                                    │                                    │
    │  3. POST /assets/confirm           │                                    │
    │  { gcs_path }                      │                                    │
    ├───────────────────────────────────>│                                    │
    │                                    │                                    │
    │  Asset { id, public_url, ... }     │                                    │
    │<───────────────────────────────────┤                                    │
```

### Steps in Detail

1. **Signed URL Request (`getSignedUrl`)**:
   Issues a `POST /assets/signed-url` request through [api-client](api-client.md) containing:
   - `media_type`: `'image'` or `'video'`.
   - `file_extension`: Sanitized alphanumeric extension (e.g. `'png'`, `'mp4'`) extracted from filename or inferred from MIME type.
   Receives `{ upload_url, gcs_path }`.

2. **Direct Upload (`uploadToGcs`)**:
   Performs a direct `PUT` request containing the raw `File` binary body to the returned `upload_url`. This bypasses the API backend, avoiding memory exhaustion and request size limits on the API server.

3. **Asset Confirmation (`confirmUpload`)**:
   Issues a `POST /assets/confirm` request with `{ gcs_path }` to register the file in the backend database. Returns the finalized `Asset` object.

Progress callbacks map the process across stages:
- 0–30%: Requesting signed URL.
- 30–90%: Binary PUT transfer to GCS.
- 90–100%: Backend confirmation.

## Validation Rules & Constants

Validation logic in `validateFile` enforces strict media constraints:

| Constraint | Limit | Implementation |
|---|---|---|
| Maximum file size | 500 MB (`500 * 1024 * 1024` bytes) | `MAX_FILE_SIZE` constant |
| Maximum attachments | 10 attachments per task | `MAX_ATTACHMENTS` constant |
| Allowed MIME types | Images (`image/*`) and Videos (`video/*`) | `ALLOWED_MIME_PREFIXES` |

Any violation halts the process before network requests are dispatched, presenting a clear error to the user.

## Uploader Component (`AttachmentUploader`)

`src/components/AttachmentUploader.tsx` provides a drag-and-drop file interface:
- **Drop Zone**: Handles `dragover`, `dragleave`, and `drop` events with visual highlight styling.
- **File Input**: Hidden `<input type="file" multiple accept="image/*,video/*" />` triggered on click or drop.
- **Batch Processing**: Sequentially processes selected files, enforcing the 10-attachment total ceiling before uploading.
- **Upload Progress Bar**: Displays real-time percentage indicators during binary upload.
- **Error Reporting**: Displays immediate error banners for files exceeding 500 MB, unsupported types, or attachment limits.

## Attachment Chip Component (`AttachmentChip`)

`src/components/AttachmentChip.tsx` renders attached media in task lists and modal editors:
- **Filename Resolution**: `getFileName(asset)` parses the GCS path or URL pathname to display human-readable file names.
- **Image Previews**: Renders a compact thumbnail `<img>` tag next to the file name.
- **Video Previews**: Detects video formats (MIME type or extensions `.mp4`, `.webm`, `.mov`), rendering a thumbnail `<video>` preview.
- **Links**: Wraps the item in an anchor tag targeting `asset.public_url` with `target="_blank"` and `rel="noopener noreferrer"`.
- **Deletion**: When rendered in modals, displays an accessible `"Remove attachment"` button that triggers `onRemove(asset.id)` without affecting other assets.

Attachment IDs are passed to task creation and update payloads as described in [tasks](tasks.md).
