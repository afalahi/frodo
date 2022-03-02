import { generateAmApi, generateOauth2Api } from './BaseApi.js';
import fs from 'fs';
import os from 'os';
import url from 'url';
import util from 'util';
import { createHash, randomBytes } from 'crypto';
import * as base64url from './utils/Base64URL.js';
import readlineSync from 'readline-sync';
import storage from '../storage/SessionStorage.js';
import * as global from '../storage/StaticStorage.js';
import DataProtection from './utils/DataProtection.js';

const dataProtection = new DataProtection()
const adminClientPassword = "doesnotmatter"
const serverInfoURLTemplate = "%s/json/serverinfo/%s"
const authorizeURLTemplate = "%s/oauth2%s/authorize"
const accessTokenURLTemplate = "%s/oauth2%s/access_token"
const redirectURLTemplate = "/platform/appAuthHelperRedirect.html"

const idmAdminScope = "fr:idm:*"
const authenticationApiVersion = "resource=2.0, protocol=1.0"
const getAuthenticationApiConfig = () => {
    return {
        apiVersion: authenticationApiVersion
    };
};
const oauth2ApiVersion = "resource=1.0, protocol=1.0"
const getOauth2ApiConfig = () => {
    return {
        apiVersion: oauth2ApiVersion
    };
};
const serverInfoApiVersion = "resource=1.1"
const getServerInfoApiConfig = () => {
    return {
        apiVersion: serverInfoApiVersion
    };
};
const serverVersionoApiVersion = "resource=1.0"
const getServerVersionApiConfig = () => {
    return {
        apiVersion: serverVersionoApiVersion
    };
};

let adminClientId = "idmAdminClient"

const realmPathTemplate = "/realms/%s";

const connFile = {
    "name": "./connections.json",
    "options": 'utf8',
    "indentation": 4
};

const getConnectionFolder = () => `${os.homedir()}/.frodo`;

export function getConnectionFileName() {
    return (os.homedir() + "/.frodo/.frodorc");
};

function findByWildcard(data, tenant) {
    for(const savedTenant in data) {
        if(savedTenant.includes(tenant)) {
            let ret = data[savedTenant];
            ret.tenant = savedTenant;
            return ret;
        }
    }
    return null;
}

export function listConnections() {
    const filename = getConnectionFileName();
    try {
        const data = fs.readFileSync(filename, "utf8");
        const connectionsData = JSON.parse(data);
        console.log(`[Host] : [Username]`);
        Object.keys(connectionsData).forEach(c => {
            console.log(`- [${c}] : [${connectionsData[c].username}]${connectionsData[c].logApiKey?" [Log API key present]":""}`);
        });
        console.log("Any unique substring of a saved host can be used as the value for host parameter in all commands");
    } catch (e) {
        console.error(`No connections found in ${filename} (${e.message})`);
    }
}

export function initConnections() {
    // create connections.json file if it doesn't exist
    const folderName = getConnectionFolder()
    const filename = getConnectionFileName();
    if(!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, {recursive:true})
            if (!fs.existsSync(filename)) {
              fs.writeFileSync(
                filename,
                JSON.stringify({}, null, connFile.indentation)
              );
            }
    }
    // encrypt the password from clear text to aes-256-GCM
    else {
        const data = fs.readFileSync(filename, connFile.options);
        var connectionsData = JSON.parse(data);
        var convert = false;
        Object.keys(connectionsData).forEach(async conn => {
            if (connectionsData[conn].password) {
                convert = true;
                connectionsData[conn].encodedPassword = await dataProtection.encrypt(connectionsData[conn].password) //Buffer.from(connectionsData[conn].password).toString('base64');
                delete connectionsData[conn].password;
            }
        });
        if (convert) {
            fs.writeFileSync(filename, JSON.stringify(connectionsData, null, connFile.indentation));
        }
    }
}

export async function getConnection() {
    try {
        const filename = getConnectionFileName();
        const connectionsData = JSON.parse(fs.readFileSync(filename, connFile.options));
        const tenantData = findByWildcard(connectionsData, storage.session.getTenant());
        if(!tenantData) {
            console.error(`No saved credentials for tenant ${storage.session.getTenant()}. Please specify credentials on command line`);
            return null;
        }
        return {
            tenant: tenantData.tenant,
            username: tenantData.username ? tenantData.username : null,
            password: tenantData.encodedPassword ? await dataProtection.decrypt(tenantData.encodedPassword) : null,
            key: tenantData.logApiKey?tenantData.logApiKey:null,
            secret: tenantData.logApiSecret?tenantData.logApiSecret:null
        }    
    } catch(e) {
        console.error("Can not read saved connection info, please specify credentials on command line: " + e)
        return null;
    }
}

export async function saveConnection() {
    const filename = getConnectionFileName();
    console.log(`Saving creds in ${filename}...`);
    let connectionsData = {};
    let existingData = {};
    try {
        const fstat = fs.statSync(filename);
        const data = fs.readFileSync(filename, "utf8");
        connectionsData = JSON.parse(data);
        if (connectionsData[storage.session.getTenant()]) {
            existingData = connectionsData[storage.session.getTenant()];
            console.log(`Updating existing connection profile ${storage.session.getTenant()}`);
        } else
            console.log(`Adding connection profile ${storage.session.getTenant()}`);
    } catch (e) {
        console.log(`Creating connection profile file ${filename} with ${storage.session.getTenant()}`);
    }
    if (storage.session.getUsername()) existingData.username = storage.session.getUsername();
    if (storage.session.getPassword()) existingData.encodedPassword = await dataProtection.encrypt(storage.session.getPassword()) //Buffer.from(storage.session.getPassword()).toString('base64');
    if (storage.session.getLogApiKey()) existingData.logApiKey = storage.session.getLogApiKey();
    if (storage.session.getLogApiSecret()) existingData.logApiSecret = storage.session.getLogApiSecret();
    connectionsData[storage.session.getTenant()] = existingData;

    fs.writeFileSync(filename, JSON.stringify(connectionsData, null, 2));
    console.log("done.");
}

function getRealmUrl(realm) {
    if (realm.startsWith("/") && realm.length > 1) {
        realm = realm.substring(1);
    }
    let realmPath = util.format(realmPathTemplate, "root")
    if (realm != "/") {
        realmPath += util.format(realmPathTemplate, realm)
    }
    return realmPath
}

async function getCookieName() {
    try {
        const urlString = util.format(serverInfoURLTemplate, storage.session.getTenant(), "*");
        const serverinfo = await generateAmApi(getServerInfoApiConfig()).get(urlString, {});
        return serverinfo.data.cookieName;
    } catch(e) {
        console.error("error getting cookie name: " + e)
        return null;
    }
}

async function checkAndHandle2FA(payload) {
    // console.log(JSON.stringify(payload, null, 2));
    // let skippable = false;
    if("callbacks" in payload) {
        for(const element of payload.callbacks) {
            if(element.type == "HiddenValueCallback") {
                if(element.input[0].value.includes("skip")) {
                    // skippable = true;
                    element.input[0].value = "Skip";
                    return {
                        need2fa: true,
                        // canskip: true,
                        payload: payload
                    }
                }
            }
            if(element.type == "NameCallback") {
                if(element.output[0].value.includes("code")) {
                    // skippable = false;
                    console.log("2FA is enabled and required for this user...");
                    const code = readlineSync.question(`${element.output[0].value}: `);
                    element.input[0].value = code;
                    return {
                        need2fa: true,
                        // canskip: false,
                        payload: payload
                    }
                }
            }
        }
    } else {
        // console.info("NO2FA");
        return {
            need2fa: false,
            // canskip: null,
            payload: payload
        }
    }
}

function determineDefaultRealm(deploymentType) {
    if (storage.session.getRealm() === global.DEFAULT_REALM_KEY) {
        storage.session.setRealm(global.DEPLOYMENT_TYPE_REALM_MAP[deploymentType]);
    }
}

async function determineDeployment() {
	const fidcClientId = "idmAdminClient";
	const forgeopsClientId = "idm-admin-ui";
    let response = {};

    const verifier = base64url.encode(randomBytes(32));
    const challenge = base64url.encode(createHash('sha256').update(verifier).digest());
    const challengeMethod = "S256";
    const authorizeURL = util.format(authorizeURLTemplate, storage.session.getTenant(), "");
    const redirectURL = url.resolve(storage.session.getTenant(), redirectURLTemplate);

    let bodyFormData = `redirect_uri=${redirectURL}&scope=${idmAdminScope}&response_type=code&client_id=${fidcClientId}&csrf=${storage.session.getCookieValue()}&decision=allow&code_challenge=${challenge}&code_challenge_method=${challengeMethod}`;
   
    let deploymentType = global.CLASSIC_DEPLOYMENT_TYPE_KEY;
    try {
        response = await generateOauth2Api(getOauth2ApiConfig()).post(authorizeURL, bodyFormData, {maxRedirects: 0});
    } catch(e) {
        if(e.response && e.response.status == 302) {
            console.log("ForgeRock Identity Cloud detected.");
            deploymentType = global.CLOUD_DEPLOYMENT_TYPE_KEY;
        } else {
            try {
                bodyFormData = `redirect_uri=${redirectURL}&scope=${idmAdminScope}&response_type=code&client_id=${forgeopsClientId}&csrf=${storage.session.getCookieValue()}&decision=allow&code_challenge=${challenge}&code_challenge_method=${challengeMethod}`;
                response = await generateOauth2Api(getOauth2ApiConfig()).post(authorizeURL, bodyFormData, {maxRedirects: 0});
            } catch(ex) {
                if(ex.response.status == 302) {
                    adminClientId = forgeopsClientId;
                    console.log("ForgeOps deployment detected.");
                    deploymentType = global.FORGEOPS_DEPLOYMENT_TYPE_KEY;
                } else {
                    console.log("Classic deployment detected.");
                }
            }
        }
    }
    determineDefaultRealm(deploymentType);
    return deploymentType;
}

async function getVersionInfo() {
    try {
        const serverVersionURL = util.format(serverInfoURLTemplate, storage.session.getTenant(), "version")
        const response = await generateAmApi(getServerVersionApiConfig()).get(serverVersionURL, {});
        if("version" in response.data) {
            let versionString = response.data.version;
            const rx = /([\d]\.[\d]\.[\d](\.[\d])*)/g;
            let version = versionString.match(rx);
            console.log("Connected to " + response.data.fullVersion);
            return version[0];
        } else {
            console.error("error getting version info: version not in response data")
        }
    } catch(e) {
        console.error("error getting version info - ", e.message)
    }
}

async function authenticate() {
    storage.session.setCookieName(await getCookieName());
    try {
        const urlString = util.format("%s/json%s/authenticate", storage.session.getTenant(), getRealmUrl("/"))
        const response = await generateAmApi(getAuthenticationApiConfig()).post(
            urlString,
            {},
            {
                headers: {
                    "X-OpenAM-Username": storage.session.getUsername(),
                    "X-OpenAM-Password": storage.session.getPassword()
                }
            }
        );
        // console.log(response.data);
        const skip2FA = await checkAndHandle2FA(response.data);
        let response2 = {};
        if(skip2FA.need2fa) {
            response2 = await generateAmApi(getAuthenticationApiConfig()).post(
                urlString,
                skip2FA.payload,
                {}
            );
        } else {
            response2.data = skip2FA.payload;
        }
        // console.log(response2.data);
        if("tokenId" in response2.data) {
            storage.session.setCookieValue(response2.data.tokenId);
            if(!storage.session.getDeploymentType()) {
                // console.log("Detecting deployment type...");
                storage.session.setDeploymentType(await determineDeployment());
            }
            storage.session.setAmVersion(await getVersionInfo());
            return "";
        } else {
            console.error("error authenticating - ", e.message);
            console.error("+++ likely cause, bad credentials!!! +++");
            return null;
        }
    } catch(e) {
        // console.log(e);
        if(e.response && e.response.status == 401) {
            console.error("error authenticating - %s", e.message);
            console.error("+++ likely cause, bad credentials +++");
            return null;
        }
        else if (e.message && e.message == "self signed certificate") {
            console.error("error authenticating - %s", e.message);
            console.error("+++ use -k, --insecure option to allow +++");
        }
        else {
            console.error("error authenticating - %s", e.message);
            return null;
        }
    }
}

async function getAuthCode(authorizeURL, redirectURL, codeChallenge, codeChallengeMethod)  {
    try {
        let bodyFormData = `redirect_uri=${redirectURL}&scope=${idmAdminScope}&response_type=code&client_id=${adminClientId}&csrf=${storage.session.getCookieValue()}&decision=allow&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`;
        const response = await generateOauth2Api(getOauth2ApiConfig()).post(
            authorizeURL,
            bodyFormData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'}
            }
        );
        if(response.status < 200 || response.status > 399) {
            console.error("error getting auth code");
            console.error("likely cause: mismatched parameters with OAuth client config");
            return null;
        }
        const redirectLocationURL = response.request.res.responseUrl;
        const queryObject = url.parse(redirectLocationURL, true).query;
        if("code" in queryObject) {
            return queryObject.code;
        } else {
            console.error("auth code not found");
            return null;
        }
    } catch(e) {
        console.error("error getting auth code - ", e.message);
        return null;
    }
}

async function getAccessToken() {
    try {
        const verifier = base64url.encode(randomBytes(32));
        const challenge = base64url.encode(createHash('sha256').update(verifier).digest());
        const challengeMethod = "S256";
        const authorizeURL = util.format(authorizeURLTemplate, storage.session.getTenant(), "");
        const accessTokenURL = util.format(accessTokenURLTemplate, storage.session.getTenant(), "");
        const redirectURL = url.resolve(storage.session.getTenant(), redirectURLTemplate);
        const authCode = await getAuthCode(authorizeURL, redirectURL, challenge, challengeMethod)
        if(authCode == null) {
            console.error("error getting auth code");
            return null;
        }
        let response = null;
        if(storage.session.getDeploymentType() == global.CLOUD_DEPLOYMENT_TYPE_KEY) {
            const auth = {
                username: adminClientId,
                password: adminClientPassword
            };
            let bodyFormData = `redirect_uri=${redirectURL}&grant_type=authorization_code&code=${authCode}&code_verifier=${verifier}`;
            response = await generateOauth2Api(getOauth2ApiConfig()).post(accessTokenURL, bodyFormData, {auth: auth});
        } else {
            let bodyFormData = `client_id=${adminClientId}&redirect_uri=${redirectURL}&grant_type=authorization_code&code=${authCode}&code_verifier=${verifier}`;
            response = await generateOauth2Api(getOauth2ApiConfig()).post(accessTokenURL, bodyFormData);
        }
        if(response.status < 200 || response.status > 399) {
            console.error("access token call returned " + response.status);
            return null;
        }
        if("access_token" in response.data) {
            storage.session.setBearerToken(response.data.access_token);
            return "";
        } else {
            console.error("can't get access token");
            return null;
        }
    } catch(e) {
        console.error("error getting access token - ");
        return null;
    }
}

export async function getTokens() {
    let credsFromParameters = true;
    // if username/password on cli are empty, try to read from connections.json
    if(storage.session.getUsername() == null && storage.session.getPassword() == null) {
        credsFromParameters = false;
        const conn = await getConnection();
        storage.session.setTenant(conn.tenant);
        storage.session.setUsername(conn.username);
        storage.session.setPassword(conn.password);
    }
    await authenticate();
    // console.log("Session token: " + storage.session.getCookieValue());
    if(storage.session.getCookieValue() && !storage.session.getBearerToken() && (storage.session.getDeploymentType() == global.CLOUD_DEPLOYMENT_TYPE_KEY || storage.session.getDeploymentType() == global.FORGEOPS_DEPLOYMENT_TYPE_KEY)) {
        await getAccessToken()
        // console.log("Bearer token: " + storage.session.getBearerToken());
    }
    if(storage.session.getCookieValue() && credsFromParameters) {
        // valid cookie, which means valid username/password combo. Save it in connections.json
        saveConnection();
        return true;
    } else if(!storage.session.getCookieValue()) {
        return false;
    }
    return true;
}
