import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOKEN_KEY } from '../src/api/client';
import CreateTaskModal from '../src/components/CreateTaskModal';
import EditTaskModal from '../src/components/EditTaskModal';
import TaskItem from '../src/components/TaskItem';
import AttachmentUploader from '../src/components/AttachmentUploader';
import AttachmentChip from '../src/components/AttachmentChip';
import { uploadFileDirectly, validateFile, MAX_FILE_SIZE } from '../src/services/storage';
import { Todo, Asset } from '../src/types/todo';

const mockAssetImage: Asset = {
  id: 'asset-img-1',
  user_id: 'user-1',
  gcs_path: 'users/user-1/image/uuid-img-1.png',
  public_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/uuid-img-1.png',
  media_type: 'image',
  created_at: '2026-01-01T12:00:00.000Z',
};

const mockAssetVideo: Asset = {
  id: 'asset-vid-1',
  user_id: 'user-1',
  gcs_path: 'users/user-1/video/uuid-vid-1.mp4',
  public_url: 'https://storage.googleapis.com/test-bucket/users/user-1/video/uuid-vid-1.mp4',
  media_type: 'video',
  created_at: '2026-01-01T12:05:00.000Z',
};

describe('Direct-to-cloud Media Attachments (T5 / R6 & R3 AC-3)', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Storage service utilities (src/services/storage.ts)', () => {
    it('validates MIME type, allowing image/* and video/* and rejecting others', () => {
      const validImage = new File(['img content'], 'test.png', { type: 'image/png' });
      const validVideo = new File(['vid content'], 'test.mp4', { type: 'video/mp4' });
      const invalidPdf = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      const invalidText = new File(['txt content'], 'test.txt', { type: 'text/plain' });

      expect(validateFile(validImage, 0)).toBeNull();
      expect(validateFile(validVideo, 0)).toBeNull();
      expect(validateFile(invalidPdf, 0)).toMatch(/image or video|unsupported|type/i);
      expect(validateFile(invalidText, 0)).toMatch(/image or video|unsupported|type/i);
    });

    it('enforces 500 MB file size limit', () => {
      const smallFile = new File(['small'], 'photo.jpg', { type: 'image/jpeg' });
      expect(validateFile(smallFile, 0)).toBeNull();

      const largeFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE + 1 });
      expect(validateFile(largeFile, 0)).toMatch(/500\s*mb|size/i);
    });

    it('enforces 10 attachments cap', () => {
      const validFile = new File(['ok'], 'photo.jpg', { type: 'image/jpeg' });
      expect(validateFile(validFile, 9)).toBeNull();
      expect(validateFile(validFile, 10)).toMatch(/10|maximum|limit/i);
      expect(validateFile(validFile, 11)).toMatch(/10|maximum|limit/i);
    });

    it('executes 3-step pipeline in uploadFileDirectly (signed-url -> PUT -> confirm)', async () => {
      const file = new File(['binary-image-data'], 'vacation.jpg', { type: 'image/jpeg' });
      const signedUrlResponse = {
        upload_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/vacation.jpg',
        gcs_path: 'users/user-1/image/vacation.jpg',
      };
      const confirmedAsset: Asset = {
        id: 'asset-new-1',
        user_id: 'user-1',
        gcs_path: signedUrlResponse.gcs_path,
        public_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/vacation.jpg',
        media_type: 'image',
        created_at: '2026-01-01T12:00:00.000Z',
      };

      const calls: { url: string; method?: string; body?: any }[] = [];
      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        calls.push({ url: String(url), method: init?.method, body: init?.body });
        if (String(url).endsWith('/assets/signed-url') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => signedUrlResponse,
          });
        }
        if (String(url) === signedUrlResponse.upload_url && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => '',
          });
        }
        if (String(url).endsWith('/assets/confirm') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => confirmedAsset,
          });
        }
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      });

      const onProgress = vi.fn();
      const result = await uploadFileDirectly(file, onProgress);

      expect(result).toEqual(confirmedAsset);
      expect(calls).toHaveLength(3);
      // Step 1: POST /assets/signed-url
      expect(calls[0].url).toContain('/assets/signed-url');
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body)).toEqual({
        media_type: 'image',
        file_extension: 'jpg',
      });
      // Step 2: PUT upload_url
      expect(calls[1].url).toBe(signedUrlResponse.upload_url);
      expect(calls[1].method).toBe('PUT');
      // Step 3: POST /assets/confirm
      expect(calls[2].url).toContain('/assets/confirm');
      expect(calls[2].method).toBe('POST');
      expect(JSON.parse(calls[2].body)).toEqual({
        gcs_path: signedUrlResponse.gcs_path,
      });

      // Progress callback should have been called
      expect(onProgress).toHaveBeenCalled();
    });

    it('throws error when GCS PUT fails without calling confirm', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/fail-upload',
              gcs_path: 'users/user-1/image/fail.png',
            }),
          });
        }
        if (String(url).includes('fail-upload')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: async () => 'Signature expired',
          });
        }
        return Promise.reject(new Error(`Unexpected call: ${url}`));
      });

      await expect(uploadFileDirectly(file)).rejects.toThrow();
    });
  });

  describe('AttachmentUploader component (R6 AC-1, AC-2, AC-3, AC-4)', () => {
    it('restricts file input to image/* and video/* MIME types', () => {
      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={vi.fn()} />);
      const fileInput = screen.getByTestId('attachment-file-input') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toContain('image/*');
      expect(fileInput.accept).toContain('video/*');
    });

    it('rejects unsupported MIME types with an inline error message without uploading', async () => {
      const onUploaded = vi.fn();
      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={onUploaded} />);

      const fileInput = screen.getByTestId('attachment-file-input');
      const invalidFile = new File(['doc content'], 'document.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(await screen.findByText(/only image and video files are supported|invalid file type/i)).toBeInTheDocument();
      expect(onUploaded).not.toHaveBeenCalled();
    });

    it('rejects files exceeding 500 MB with an inline error message', async () => {
      const onUploaded = vi.fn();
      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={onUploaded} />);

      const fileInput = screen.getByTestId('attachment-file-input');
      const largeFile = new File(['data'], 'massive.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', { value: 501 * 1024 * 1024 });

      await userEvent.upload(fileInput, largeFile);

      expect(await screen.findByText(/exceeds 500\s*mb limit|file too large/i)).toBeInTheDocument();
      expect(onUploaded).not.toHaveBeenCalled();
    });

    it('blocks upload and displays inline error if 10 attachments are already present or reached', async () => {
      const onUploaded = vi.fn();
      const tenAssets: Asset[] = Array.from({ length: 10 }, (_, i) => ({
        id: `asset-${i}`,
        user_id: 'user-1',
        gcs_path: `users/user-1/image/photo-${i}.jpg`,
        public_url: `https://storage.googleapis.com/test-bucket/users/user-1/image/photo-${i}.jpg`,
        media_type: 'image',
        created_at: '2026-01-01T12:00:00.000Z',
      }));

      render(<AttachmentUploader currentAssets={tenAssets} onAssetUploaded={onUploaded} />);

      // Should show maximum reached or file input disabled
      const fileInput = screen.getByTestId('attachment-file-input');
      const validFile = new File(['img'], 'eleventh.png', { type: 'image/png' });

      await userEvent.upload(fileInput, validFile);

      const errorEl = await screen.findByTestId('attachment-error');
      expect(errorEl).toHaveTextContent(/10/);
      expect(onUploaded).not.toHaveBeenCalled();
    });

    it('uploads valid media file, displays progress, and notifies onAssetUploaded (R6 AC-3)', async () => {
      const onUploaded = vi.fn();

      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/beach.jpg',
              gcs_path: 'users/user-1/image/beach.jpg',
            }),
          });
        }
        if (String(url).includes('beach.jpg') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => '',
          });
        }
        if (String(url).endsWith('/assets/confirm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockAssetImage,
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });

      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={onUploaded} />);

      const fileInput = screen.getByTestId('attachment-file-input');
      const validFile = new File(['beach-data'], 'beach.jpg', { type: 'image/jpeg' });

      await userEvent.upload(fileInput, validFile);

      await waitFor(() => {
        expect(onUploaded).toHaveBeenCalledWith(mockAssetImage);
      });
    });

    it('displays inline error on GCS upload failure without adding unconfirmed asset (R6 AC-4)', async () => {
      const onUploaded = vi.fn();

      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/failing-bucket/pic.jpg',
              gcs_path: 'users/user-1/image/pic.jpg',
            }),
          });
        }
        if (String(url).includes('failing-bucket') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'GCS Server Error',
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });

      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={onUploaded} />);

      const fileInput = screen.getByTestId('attachment-file-input');
      const validFile = new File(['pic-data'], 'pic.jpg', { type: 'image/jpeg' });

      await userEvent.upload(fileInput, validFile);

      expect(await screen.findByText(/failed to upload|upload failed|error/i)).toBeInTheDocument();
      expect(onUploaded).not.toHaveBeenCalled();
    });

    it('supports drag and drop file upload onto dropzone area', async () => {
      const onUploaded = vi.fn();

      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/dragged.jpg',
              gcs_path: 'users/user-1/image/dragged.jpg',
            }),
          });
        }
        if (String(url).includes('dragged.jpg') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => '',
          });
        }
        if (String(url).endsWith('/assets/confirm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockAssetImage,
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });

      render(<AttachmentUploader currentAssets={[]} onAssetUploaded={onUploaded} />);

      const dropzone = screen.getByTestId('attachment-dropzone');
      const validFile = new File(['drag-data'], 'dragged.jpg', { type: 'image/jpeg' });

      fireEvent.dragOver(dropzone);
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [validFile],
        },
      });

      await waitFor(() => {
        expect(onUploaded).toHaveBeenCalledWith(mockAssetImage);
      });
    });
  });

  describe('AttachmentChip component (R6 AC-5)', () => {
    it('renders preview thumbnail for image asset and links to public_url with target="_blank"', () => {
      render(<AttachmentChip asset={mockAssetImage} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', mockAssetImage.public_url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockAssetImage.public_url);
    });

    it('renders preview thumbnail / indicator for video asset and links to public_url in new tab', () => {
      render(<AttachmentChip asset={mockAssetVideo} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', mockAssetVideo.public_url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });

    it('renders remove button when onRemove callback is provided and invokes it on click', async () => {
      const onRemove = vi.fn();
      render(<AttachmentChip asset={mockAssetImage} onRemove={onRemove} />);

      const removeBtn = screen.getByRole('button', { name: /remove/i });
      expect(removeBtn).toBeInTheDocument();

      await userEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith(mockAssetImage.id);
    });

    it('does not render remove button when onRemove callback is omitted (read-only mode)', () => {
      render(<AttachmentChip asset={mockAssetImage} />);
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('TaskItem media thumbnails and attachment count (R6 AC-5)', () => {
    const todoWithAssets: Todo = {
      id: 'todo-attachments-1',
      user_id: 'user-1',
      title: 'Task with media attachments',
      description: 'Contains images and videos',
      is_completed: false,
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-01-01T12:00:00.000Z',
      assets: [mockAssetImage, mockAssetVideo],
    };

    it('renders attachment count and preview thumbnails on TaskItem, opening public_url in new tab', () => {
      render(<TaskItem todo={todoWithAssets} />);

      // Verify attachment count
      expect(screen.getByText(/2 attached assets/i)).toBeInTheDocument();

      // Verify preview thumbnails are rendered
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockAssetImage.public_url);

      // Verify links open public_url in new tab
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain(mockAssetImage.public_url);
      expect(hrefs).toContain(mockAssetVideo.public_url);

      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
      });
    });
  });

  describe('CreateTaskModal linking asset UUIDs (R3 AC-3)', () => {
    it('uploads an attachment and includes confirmed asset UUID in POST /todos payload', async () => {
      const createdTodo: Todo = {
        id: 'todo-created-with-asset',
        user_id: 'user-1',
        title: 'Task With Attachment',
        description: 'Description here',
        is_completed: false,
        created_at: '2026-01-01T14:00:00.000Z',
        updated_at: '2026-01-01T14:00:00.000Z',
        assets: [mockAssetImage],
      };

      let postTodosBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/test-bucket/users/user-1/image/test.png',
              gcs_path: 'users/user-1/image/test.png',
            }),
          });
        }
        if (urlStr.includes('storage.googleapis.com') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => '',
          });
        }
        if (urlStr.endsWith('/assets/confirm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockAssetImage,
          });
        }
        if (urlStr.endsWith('/todos') && init?.method === 'POST') {
          postTodosBody = JSON.parse(init?.body as string);
          return Promise.resolve({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => createdTodo,
          });
        }
        return Promise.reject(new Error(`Unhandled: ${urlStr}`));
      });

      const onTaskCreated = vi.fn();
      render(<CreateTaskModal isOpen={true} onClose={vi.fn()} onTaskCreated={onTaskCreated} />);

      // Fill in title
      const titleInput = screen.getByLabelText(/title/i);
      await userEvent.type(titleInput, 'Task With Attachment');

      // Upload attachment
      const fileInput = screen.getByTestId('attachment-file-input');
      const validFile = new File(['img-content'], 'test.png', { type: 'image/png' });
      await userEvent.upload(fileInput, validFile);

      // Verify attachment chip is displayed in modal
      expect(await screen.findByTestId(`attached-asset-${mockAssetImage.id}`)).toBeInTheDocument();

      // Submit modal
      const submitBtn = screen.getByRole('button', { name: /create task|save|submit/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(postTodosBody).toBeDefined();
        expect(postTodosBody.title).toBe('Task With Attachment');
        expect(postTodosBody.asset_ids).toEqual([mockAssetImage.id]);
        expect(onTaskCreated).toHaveBeenCalledWith(createdTodo);
      });
    });
  });

  describe('EditTaskModal attachments integration', () => {
    it('allows uploading additional attachments and submitting via PATCH /todos/{id}', async () => {
      const existingTodo: Todo = {
        id: 'todo-existing-1',
        user_id: 'user-1',
        title: 'Existing Task',
        description: 'Existing Desc',
        is_completed: false,
        created_at: '2026-01-01T12:00:00.000Z',
        updated_at: '2026-01-01T12:00:00.000Z',
        assets: [mockAssetImage],
      };

      let patchBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/assets/signed-url')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              upload_url: 'https://storage.googleapis.com/test-bucket/users/user-1/video/clip.mp4',
              gcs_path: 'users/user-1/video/clip.mp4',
            }),
          });
        }
        if (urlStr.includes('storage.googleapis.com') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => '',
          });
        }
        if (urlStr.endsWith('/assets/confirm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockAssetVideo,
          });
        }
        if (urlStr.endsWith(`/todos/${existingTodo.id}`) && init?.method === 'PATCH') {
          patchBody = JSON.parse(init?.body as string);
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              ...existingTodo,
              assets: [mockAssetImage, mockAssetVideo],
            }),
          });
        }
        return Promise.reject(new Error(`Unhandled: ${urlStr}`));
      });

      const onTaskUpdated = vi.fn();
      render(
        <EditTaskModal
          isOpen={true}
          todo={existingTodo}
          onClose={vi.fn()}
          onTaskUpdated={onTaskUpdated}
        />
      );

      // Existing asset chip should be present
      expect(screen.getByTestId(`attached-asset-${mockAssetImage.id}`)).toBeInTheDocument();

      // Upload a new video attachment
      const fileInput = screen.getByTestId('attachment-file-input');
      const videoFile = new File(['vid-content'], 'clip.mp4', { type: 'video/mp4' });
      await userEvent.upload(fileInput, videoFile);

      // Both assets should now be visible
      expect(await screen.findByTestId(`attached-asset-${mockAssetVideo.id}`)).toBeInTheDocument();

      // Save changes
      const saveBtn = screen.getByRole('button', { name: /save changes|save/i });
      await userEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchBody).toBeDefined();
        expect(patchBody.asset_ids).toEqual([mockAssetImage.id, mockAssetVideo.id]);
        expect(onTaskUpdated).toHaveBeenCalled();
      });
    });
  });
});
