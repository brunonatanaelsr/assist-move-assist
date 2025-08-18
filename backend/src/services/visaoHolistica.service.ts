import { db } from './db';

class VisaoHolisticaService {
  async create(data: any) {
    return db.insert('visao_holistica', data);
  }

  async findByBeneficiaria(beneficiariaId: number) {
    const result = await db.query(
      'SELECT * FROM visao_holistica WHERE beneficiaria_id = $1 ORDER BY data_avaliacao DESC LIMIT 1',
      [beneficiariaId]
    );
    return result[0] || null;
  }
}

export const visaoHolisticaService = new VisaoHolisticaService();
export default visaoHolisticaService;
