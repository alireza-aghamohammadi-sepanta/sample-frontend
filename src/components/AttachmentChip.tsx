import React from 'react';
import { Asset } from '../types/todo';

export interface AttachmentChipProps {
  asset: Asset;
  onRemove?: (assetId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function getFileName(asset: Asset): string {
  if (asset.gcs_path) {
    const parts = asset.gcs_path.split('/');
    return parts[parts.length - 1];
  }
  if (asset.public_url) {
    try {
      const url = new URL(asset.public_url);
      const parts = url.pathname.split('/');
      return parts[parts.length - 1];
    } catch {
      const parts = asset.public_url.split('/');
      return parts[parts.length - 1];
    }
  }
  return asset.id;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({
  asset,
  onRemove,
  className,
  style,
}) => {
  const fileName = getFileName(asset);
  const isVideo =
    asset.media_type === 'video' ||
    asset.media_type?.startsWith('video/') ||
    fileName.endsWith('.mp4') ||
    fileName.endsWith('.webm') ||
    fileName.endsWith('.mov');

  return (
    <div
      data-testid={`attached-asset-${asset.id}`}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.6rem',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '0.85rem',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <a
        href={asset.public_url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`attachment-link-${asset.id}`}
        title={`Open ${fileName} in new tab`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          color: '#1a73e8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: onRemove ? 'calc(100% - 70px)' : '100%',
        }}
      >
        {isVideo ? (
          <div
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              backgroundColor: '#1e293b',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <video
              src={asset.public_url}
              data-testid={`attachment-video-${asset.id}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              ▶
            </span>
          </div>
        ) : (
          <img
            src={asset.public_url}
            alt={fileName}
            data-testid={`attachment-thumbnail-${asset.id}`}
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'cover',
              borderRadius: '4px',
              backgroundColor: '#eee',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
            color: '#334155',
            fontWeight: 500,
          }}
        >
          {fileName}
        </span>
      </a>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(asset.id);
          }}
          aria-label={`Remove asset ${asset.id}`}
          style={{
            marginLeft: 'auto',
            padding: '0.2rem 0.45rem',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            flexShrink: 0,
            lineHeight: 1,
            fontWeight: 500,
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
};

export default AttachmentChip;
