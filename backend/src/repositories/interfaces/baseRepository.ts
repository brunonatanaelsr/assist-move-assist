export interface BaseRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: number, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T>;
  delete(id: number): Promise<void>;
}
