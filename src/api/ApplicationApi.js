import util from 'util';
import { generateAmApi } from './BaseApi.js';
import { getCurrentRealmPath } from './utils/ApiUtils.js';
import storage from '../storage/SessionStorage.js';

const oauth2ApplicationURLTemplate =
  '%s/json%s/realm-config/agents/OAuth2Client/%s';
const oauth2ApplicationListURLTemplate =
  '%s/json%s/realm-config/agents/OAuth2Client?_fields=_id&_queryFilter=true';
const samlApplicationURLTemplate = '%s/json%s/realm-config/saml2/%s/%s';
const samlApplicationListURLTemplate =
  '%s/json%s/realm-config/saml2?_queryFilter=true';

const apiVersion = 'protocol=2.1,resource=1.0';
const getApiConfig = () => {
  const configPath = getCurrentRealmPath();
  return {
    path: `${configPath}/realm-config/agents/OAuth2Client`,
    apiVersion,
  };
};

// export async function listSamlEntities() {
//     try {
//         const urlString = util.format(samlApplicationListURLTemplate, storage.session.getTenant(), getCurrentRealmPath());
//         const response = await generateAmApi(getApiConfig()).get(
//             urlString,
//             { withCredentials: true }
//         );
//         if (response.status < 200 || response.status > 399) {
//             console.error("listSamlApplications ERROR: list Saml application call returned %d, possible cause: entities not found", response.status);
//             return null;
//         }
//         return response.data.result;
//     } catch (e) {
//         console.error("listSamlApplications ERROR: list Saml application error - ", e);
//         return null;
//     }
// }

export async function listOAuth2Applications() {
  try {
    const urlString = util.format(
      oauth2ApplicationListURLTemplate,
      storage.session.getTenant(),
      getCurrentRealmPath()
    );
    const response = await generateAmApi(getApiConfig()).get(urlString, {
      withCredentials: true,
    });
    if (response.status < 200 || response.status > 399) {
      console.error(
        'listOAuth2Applications ERROR: list OAuth2 application call returned %d, possible cause: applications not found',
        response.status
      );
      return [];
    }
    return response.data.result;
  } catch (e) {
    console.error(
      'listOAuth2Applications ERROR: list OAuth2 application error - ',
      e
    );
    return [];
  }
}

// export async function listApplications() {
//     let apps = await listOAuth2Applications();
//     let samlEntities = await listSamlEntities();
//     apps.concat(samlEntities);
//     // console.log(apps);
//     return apps;
// }

// export async function getSamlEntity(id, location) {
//     try {
//         const urlString = util.format(samlApplicationURLTemplate, storage.session.getTenant(), getCurrentRealmPath(), location, id);
//         const response = await generateAmApi(getApiConfig()).get(
//             urlString,
//             { withCredentials: true }
//         );
//         if (response.status < 200 || response.status > 399) {
//             console.error("getSamlEntity ERROR: get Saml entity call returned %d, possible cause: application not found", response.status);
//             return null;
//         }
//         return response.data;
//     } catch (e) {
//         console.error("getSamlEntity ERROR: get Saml entity error - ", e.message);
//         return null;
//     }
// }

export async function getOAuth2Application(id) {
  try {
    const urlString = util.format(
      oauth2ApplicationURLTemplate,
      storage.session.getTenant(),
      getCurrentRealmPath(),
      id
    );
    const response = await generateAmApi(getApiConfig()).get(urlString, {
      withCredentials: true,
    });
    if (response.status < 200 || response.status > 399) {
      console.error(
        'getOAuth2Application ERROR: get OAuth2 application call returned %d, possible cause: application not found',
        response.status
      );
      return null;
    }
    return response.data;
  } catch (e) {
    console.error(
      'getOAuth2Application ERROR: get Oauth2 application error - ',
      e.message
    );
    return null;
  }
}

export async function putApplication(id, data) {
  try {
    const urlString = util.format(
      oauth2ApplicationURLTemplate,
      storage.session.getTenant(),
      getCurrentRealmPath(storage.session.getRealm()),
      id
    );
    const response = await generateAmApi(getApiConfig()).put(urlString, data, {
      withCredentials: true,
    });
    if (response.status < 200 || response.status > 399) {
      console.error(
        `putApplication ERROR: put application call returned ${response.status}, details: ${response}`
      );
      return null;
    }
    if (response.data._id !== id) {
      console.error(
        `putApplication ERROR: generic error importing application ${id}`
      );
      return null;
    }
    return '';
  } catch (e) {
    console.error(
      `putApplication ERROR: put application error, application [${id}] - ${e.message}`,
      e
    );
    return null;
  }
}
