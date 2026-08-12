export interface BusinessRequisites {
  legalName: string;
  ogrnip: string;
  inn: string;
  address: string;
  email: string;
  phone: string;
  telegram: string;
}

export const BUSINESS_REQUISITES: BusinessRequisites = {
  legalName: 'ИП Гусын Анатолий Владимирович',
  ogrnip: '326745600118741',
  inn: '744515573967',
  address:
    '625006, Россия, Тюменская обл., г. Тюмень, ул. Северная, д. 3, к. 2, кв. 29',
  phone: '+7 900 065-85-03',
  telegram: '@Tobilk1011',
  email: 'tgusyn@gmail.com',
};

export function getPublishedRequisites(): Array<{ label: string; value: string }> {
  return [
    { label: 'Наименование', value: BUSINESS_REQUISITES.legalName },
    { label: 'ИНН', value: BUSINESS_REQUISITES.inn },
    { label: 'ОГРНИП', value: BUSINESS_REQUISITES.ogrnip },
    { label: 'Адрес', value: BUSINESS_REQUISITES.address },
    { label: 'Телефон', value: BUSINESS_REQUISITES.phone },
    { label: 'Telegram', value: BUSINESS_REQUISITES.telegram },
    { label: 'E-mail', value: BUSINESS_REQUISITES.email },
  ];
}
