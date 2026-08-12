/**
 * Реквизиты ИП для публикации на сайте (требования банка).
 * Заполните значения вручную — пустые поля не показываются в UI.
 */
export interface BusinessRequisites {
  /** Юридическое наименование / ФИО ИП, например: ИП Гусын Анатолий Владимирович */
  legalName: string | null;
  ogrnip: string | null;
  inn: string | null;
  /** Фактическое местонахождение / адрес */
  address: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
}

export const BUSINESS_REQUISITES: BusinessRequisites = {
  legalName: null,
  ogrnip: null,
  inn: null,
  address: null,
  email: null,
  phone: '+7 900 065-85-03',
  telegram: '@Tobilk1011',
};

export function getPublishedRequisites(): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string | null }> = [
    { label: 'Наименование', value: BUSINESS_REQUISITES.legalName },
    { label: 'ОГРНИП', value: BUSINESS_REQUISITES.ogrnip },
    { label: 'ИНН', value: BUSINESS_REQUISITES.inn },
    { label: 'Адрес', value: BUSINESS_REQUISITES.address },
    { label: 'Телефон', value: BUSINESS_REQUISITES.phone },
    { label: 'Telegram', value: BUSINESS_REQUISITES.telegram },
    { label: 'E-mail', value: BUSINESS_REQUISITES.email },
  ];

  return entries.filter(
    (entry): entry is { label: string; value: string } =>
      Boolean(entry.value?.trim()),
  );
}

export function hasBusinessRequisites(): boolean {
  return getPublishedRequisites().some(
    (entry) =>
      entry.label === 'Наименование' ||
      entry.label === 'ОГРНИП' ||
      entry.label === 'ИНН',
  );
}
