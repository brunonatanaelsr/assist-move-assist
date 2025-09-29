import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse } from '@/types/api';

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock('../client', () => ({
  apiService: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
    delete: mocks.deleteMock,
    getHttpClient: () => ({ post: mocks.uploadMock }),
  },
}));

import {
  createComment,
  createFeedPost,
  deleteComment,
  deleteFeedPost,
  getFeed,
  getFeedPost,
  getFeedStats,
  likeFeedPost,
  updateComment,
  updateFeedPost,
  shareFeedPost,
  uploadImage,
} from '../feed';

describe('feed api module', () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
    mocks.putMock.mockReset();
    mocks.deleteMock.mockReset();
    mocks.uploadMock.mockReset();
  });

  it('delegates listing of feed posts to apiService.get', async () => {
    const response: ApiResponse<any> = { success: true, data: [{ id: 1 }] };
    mocks.getMock.mockResolvedValue(response);

    const result = await getFeed({ page: 2 });

    expect(mocks.getMock).toHaveBeenCalledWith('/feed', { params: { page: 2 } });
    expect(result).toBe(response);
  });

  it('delegates reactions and comments to respective endpoints', async () => {
    const response: ApiResponse<any> = { success: true } as any;
    mocks.postMock.mockResolvedValue(response);
    mocks.putMock.mockResolvedValue(response);
    mocks.deleteMock.mockResolvedValue(response);

    await likeFeedPost(10);
    await shareFeedPost(10);
    await createFeedPost({ conteudo: 'olá' });
    await createComment(10, { conteudo: 'oi' });
    await updateFeedPost(10, { conteudo: 'editado' });
    await updateComment(7, { conteudo: 'editado' });
    await deleteFeedPost(10);
    await deleteComment(7);

    expect(mocks.postMock).toHaveBeenCalledWith('/feed/10/curtir', {});
    expect(mocks.postMock).toHaveBeenCalledWith('/feed/10/compartilhar', {});
    expect(mocks.postMock).toHaveBeenCalledWith('/feed', { conteudo: 'olá' });
    expect(mocks.postMock).toHaveBeenCalledWith('/feed/10/comentarios', { conteudo: 'oi' });
    expect(mocks.putMock).toHaveBeenCalled();
    expect(mocks.deleteMock).toHaveBeenCalledWith('/feed/10');
    expect(mocks.deleteMock).toHaveBeenCalledWith('/feed/comentarios/7');
  });

  it('wraps uploadImage success using the raw axios client', async () => {
    mocks.uploadMock.mockResolvedValue({ data: { data: { url: 'x', filename: 'y' } } });
    const fakeFile = new Blob(['data']) as unknown as File;

    const result = await uploadImage(fakeFile);

    expect(mocks.uploadMock).toHaveBeenCalledTimes(1);
    expect(mocks.uploadMock).toHaveBeenCalledWith(
      '/feed/upload-image',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(result).toEqual({ success: true, data: { url: 'x', filename: 'y' } });
  });

  it('returns an error envelope when uploadImage falha', async () => {
    mocks.uploadMock.mockRejectedValue({ response: { data: { message: 'Erro' } } });
    const fakeFile = new Blob(['data']) as unknown as File;

    const result = await uploadImage(fakeFile);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Erro');
  });

  it('supports fetching single posts and stats', async () => {
    const response: ApiResponse<any> = { success: true, data: {} };
    mocks.getMock.mockResolvedValue(response);

    await getFeedPost(1);
    await getFeedStats();

    expect(mocks.getMock).toHaveBeenCalledWith('/feed/1');
    expect(mocks.getMock).toHaveBeenCalledWith('/feed/stats/summary');
  });
});
