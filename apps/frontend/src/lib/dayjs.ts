import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export const formatFromNow = (date: dayjs.ConfigType): string => dayjs(date).fromNow();

export const formatDate = (date: dayjs.ConfigType, template: string): string =>
  dayjs(date).format(template);

export type Dayjs = dayjs.Dayjs;

export default dayjs;
