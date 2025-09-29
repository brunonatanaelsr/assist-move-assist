import type { ApiResponse } from '@/types/api';
import { apiService } from './client';

type FeedParams = Record<string, unknown> | undefined;

type CommentPayload = { conteudo: string };

type UploadSuccess = { url: string; filename: string };

export const getFeed = (params?: FeedParams): Promise<ApiResponse<any>> =>
  apiService.get('/feed', { params });

export const getFeedPost = (id: string | number): Promise<ApiResponse<any>> =>
  apiService.get(`/feed/${id}`);

export const createFeedPost = (data: any): Promise<ApiResponse<any>> =>
  apiService.post('/feed', data);

export const updateFeedPost = (id: string | number, data: any): Promise<ApiResponse<any>> =>
  apiService.put(`/feed/${id}`, data);

export const deleteFeedPost = (id: string | number): Promise<ApiResponse<any>> =>
  apiService.delete(`/feed/${id}`);

export const likeFeedPost = (id: string | number): Promise<ApiResponse<any>> =>
  apiService.post(`/feed/${id}/curtir`, {});

export const shareFeedPost = (id: string | number): Promise<ApiResponse<any>> =>
  apiService.post(`/feed/${id}/compartilhar`, {});

export const getFeedStats = (): Promise<ApiResponse<any>> =>
  apiService.get('/feed/stats/summary');

export const getCommentsByPostId = (
  postId: number,
  params?: FeedParams
): Promise<ApiResponse<any>> => apiService.get(`/feed/${postId}/comentarios`, { params });

export const createComment = (postId: number, data: CommentPayload): Promise<ApiResponse<any>> =>
  apiService.post(`/feed/${postId}/comentarios`, data);

export const updateComment = (
  comentarioId: number,
  data: CommentPayload
): Promise<ApiResponse<any>> => apiService.put(`/feed/comentarios/${comentarioId}`, data);

export const deleteComment = (comentarioId: number): Promise<ApiResponse<any>> =>
  apiService.delete(`/feed/comentarios/${comentarioId}`);

export const uploadImage = async (file: File): Promise<ApiResponse<UploadSuccess>> => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await apiService.getHttpClient().post('/feed/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message ?? error?.message ?? 'Erro no upload da imagem'
    };
  }
};
