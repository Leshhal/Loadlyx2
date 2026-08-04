'use client';

import { useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
}

export default function ProductImageUploader({ images, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setMessage('');
    try {
      const uploaded = [];
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.name}: only JPEG, PNG, and WebP are supported`);
        if (file.size > MAX_BYTES) throw new Error(`${file.name}: maximum size is 8 MB`);
        const response = await adminFetch('/uploads/images', {
          method: 'POST',
          body: JSON.stringify({ dataUrl: await readDataUrl(file), fileName: file.name, altText: file.name.replace(/\.[^.]+$/, '') })
        });
        const asset = await response.json();
        if (!response.ok) throw new Error(asset?.error || 'Image upload failed');
        uploaded.push({ assetId: asset.id, url: asset.url, altText: asset.altText || file.name, position: images.length + uploaded.length });
      }
      onChange([...images, ...uploaded]);
      setMessage(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
    } catch (error) {
      setMessage(error.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((image, position) => ({ ...image, position })));
  }

  function remove(index) {
    onChange(images.filter((_, current) => current !== index).map((image, position) => ({ ...image, position })));
  }

  return (
    <section className="card" style={{ gridColumn: '1 / -1', borderStyle: 'dashed' }}>
      <div className="row-between">
        <div><strong>Product photos</strong><div className="muted small">Upload JPEG, PNG, or WebP files. The first image is primary.</div></div>
        <button className="btn secondary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? 'Uploading…' : 'Choose photos'}</button>
      </div>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => uploadFiles(event.target.files)} />
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); uploadFiles(event.dataTransfer.files); }} style={{ marginTop: 12, padding: 20, border: '1px dashed rgba(148,163,184,.45)', borderRadius: 12, textAlign: 'center' }}>Drag and drop product photos here</div>
      {message ? <p className="muted small">{message}</p> : null}
      <div className="grid grid-3" style={{ marginTop: 14 }}>
        {images.map((image, index) => (
          <div className="card" key={image.assetId || `${image.url}-${index}`}>
            <img src={image.url} alt={image.altText || ''} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10 }} />
            <div className="field"><label>Alternative text</label><input value={image.altText || ''} onChange={(event) => onChange(images.map((item, current) => current === index ? { ...item, altText: event.target.value } : item))} /></div>
            <div className="action-row"><button type="button" className="btn ghost" disabled={index === 0} onClick={() => move(index, -1)}>Earlier</button><button type="button" className="btn ghost" disabled={index === images.length - 1} onClick={() => move(index, 1)}>Later</button><button type="button" className="btn secondary" onClick={() => remove(index)}>Remove</button></div>
            {index === 0 ? <span className="badge">Primary image</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
