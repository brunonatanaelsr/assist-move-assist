export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | Error;
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message: message || 'Operação realizada com sucesso',
});

export const errorResponse = (error: string | Error): ApiResponse<null> => ({
  success: false,
  error: typeof error === 'string' ? error : error.message,
  message: 'Ocorreu um erro ao processar a requisição',
});
