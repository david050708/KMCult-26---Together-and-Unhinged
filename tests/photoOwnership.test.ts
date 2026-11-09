import assert from 'node:assert/strict';
import test from 'node:test';
import { isOwnedLocalPhotoFile, isOwnedOciPhotoKey } from '../server/photoOwnership.ts';

test('only the exact memory and photo own an OCI upload', () => {
  const key = 'memories/mem-victim/photos/photo-victim/image_123.jpg';
  assert.equal(isOwnedOciPhotoKey(key, 'mem-victim', 'photo-victim'), true);
  assert.equal(isOwnedOciPhotoKey(key, 'mem-attacker', 'photo-attacker'), false);
  assert.equal(isOwnedOciPhotoKey(key, 'mem-victim', 'photo-other'), false);
  assert.equal(isOwnedOciPhotoKey(key, 'mem-victim'), false);
  for (const suffix of ['../photo-victim/image_123.jpg', 'image_123.jpg/../../other', 'image_123.jpg?key=other', 'image_123.jpg%2f..']) {
    assert.equal(isOwnedOciPhotoKey(`memories/mem-victim/photos/photo-victim/${suffix}`, 'mem-victim', 'photo-victim'), false);
  }
});

test('local cleanup has exact owner boundaries and accepts upload extensions', () => {
  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    assert.equal(isOwnedLocalPhotoFile(`mem-victim_photo-victim_123.${ext}`, 'mem-victim', 'photo-victim'), true);
  }
  for (const file of ['mem-victim_photo-victim_123.jpg', 'mem-attacker_photo-own-extra_123.jpg', '../mem-attacker_photo-own_123.jpg']) {
    assert.equal(isOwnedLocalPhotoFile(file, 'mem-attacker', 'photo-own'), false);
  }
  assert.equal(isOwnedLocalPhotoFile('mem-a_photo-a_123.jpg', '../mem-a', 'photo-a'), false);
});
