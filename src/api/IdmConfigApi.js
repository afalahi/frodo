import util from 'util';
import { generateIdmApi } from './BaseApi.js';
import { getTenantURL } from './utils/ApiUtils.js';
import storage from '../storage/SessionStorage.js';

const idmAllConfigURLTemplate = '%s/openidm/config';
const idmConfigURLTemplate = '%s/openidm/config/%s';
const idmManagedObjectURLTemplate =
  '%s/openidm/managed/%s?_queryFilter=true&_pageSize=10000';

export async function getAllConfigEntities() {
  try {
    const urlString = util.format(
      idmAllConfigURLTemplate,
      getTenantURL(storage.session.getTenant())
    );
    const response = await generateIdmApi().get(urlString);
    if (response.status < 200 || response.status > 399) {
      console.error(
        'getAllConfigEntities ERROR: get config entities call returned %d, possible cause: email template not found',
        response.status
      );
      return null;
    }
    return response.data;
  } catch (e) {
    console.error(
      'getAllConfigEntities ERROR: get config entities data error - ',
      e.message
    );
    return null;
  }
}

export async function getConfigEntity(id) {
  try {
    const urlString = util.format(
      idmConfigURLTemplate,
      getTenantURL(storage.session.getTenant()),
      id
    );
    const response = await generateIdmApi().get(urlString);
    if (response.status < 200 || response.status > 399) {
      console.error(
        'getConfigEntity ERROR: get config entities call returned %d',
        response.status
      );
      return null;
    }
    return response.data;
  } catch (e) {
    if (
      e.response.data.code === 403 &&
      e.response.data.message ===
        'This operation is not available in ForgeRock Identity Cloud.'
    ) {
      // ignore errors related to forbidden responses from ID Cloud
      return null;
    }
    console.error(
      'getConfigEntity ERROR: get config entities data error - ',
      e
    );
    return null;
  }
}

export async function putConfigEntity(id, data) {
  try {
    const urlString = util.format(
      idmConfigURLTemplate,
      getTenantURL(storage.session.getTenant()),
      id
    );
    const response = await generateIdmApi().put(urlString, data);
    if (response.status < 200 || response.status > 399) {
      console.error(
        'putConfigEntity ERROR: put config entities call returned %d',
        response.status
      );
      return null;
    }
    return response.data;
  } catch (e) {
    if (
      e.response.data.code === 403 &&
      e.response.data.message ===
        'This operation is not available in ForgeRock Identity Cloud.'
    ) {
      // ignore errors related to forbidden responses from ID Cloud
      return null;
    }
    console.error(
      'putConfigEntity ERROR: put config entities data error - ',
      e
    );
    return null;
  }
}

export async function queryManagedObjects(type, fields, pageCookie) {
  try {
    const fieldsParam =
      fields.length > 0 ? `&_fields=${fields.join(',')}` : '&_fields=_id';
    const urlTemplate = pageCookie
      ? `${idmManagedObjectURLTemplate}${fieldsParam}&_pagedResultsCookie=${pageCookie}`
      : `${idmManagedObjectURLTemplate}${fieldsParam}`;
    const urlString = util.format(
      urlTemplate,
      getTenantURL(storage.session.getTenant()),
      type
    );
    const response = await generateIdmApi().get(urlString);
    if (response.status < 200 || response.status > 399) {
      console.error(
        'queryManagedObject ERROR: get config entities call returned %d, possible cause: email template not found',
        response.status
      );
      return null;
    }
    // console.log(response.data)
    return response.data;
  } catch (e) {
    console.log(e);
    if (
      e.response.data.code === 403 &&
      e.response.data.message ===
        'This operation is not available in ForgeRock Identity Cloud.'
    ) {
      // ignore errors related to forbidden responses from ID Cloud
      return null;
    }
    console.error(
      'queryManagedObject ERROR: get config entities data error - ',
      e
    );
    return null;
  }
}

export async function getCount(type) {
  let count = 0;
  let result = {
    result: [],
    resultCount: 0,
    pagedResultsCookie: null,
    totalPagedResultsPolicy: 'NONE',
    totalPagedResults: -1,
    remainingPagedResults: -1,
  };
  process.stdout.write('Counting..');
  do {
    // eslint-disable-next-line no-await-in-loop
    result = await queryManagedObjects(type, [], result.pagedResultsCookie);
    count += result.resultCount;
    process.stdout.write('.');
    // count.active += result.result.filter(value => (value.accountStatus === 'active' || value.accountStatus === 'Active')).length;
  } while (result.pagedResultsCookie);
  console.log('');
  return count;
}
