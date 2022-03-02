import storage from '../../storage/SessionStorage.js';
import url from 'url';
import util from 'util';

const realmPathTemplate = "/realms/%s";

function getCurrentRealmPath() {
    let realm = storage.session.getRealm();
    if (realm.startsWith("/") && realm.length > 1) {
        realm = realm.substring(1);
    }
    let realmPath = util.format(realmPathTemplate, "root")
    if (realm != "/") {
        realmPath = realmPath + util.format(realmPathTemplate, realm)
    }
    return realmPath
}

function getTenantURL(tenant) {
    const parsedUrl = new URL(tenant);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
}

function applyNameCollisionPolicy(name) {
    const capturingRegex = /(.* - imported) \(([0-9]+)\)/;
    const found = name.match(capturingRegex);
    if (found) {
        // already renamed one or more times
        // console.log(found);
        if (found.length > 0 && found.length == 3) {
            // return the next number
            return found[1] + " (" + (parseInt(found[2]) + 1) + ")";
        }
    } else {
        // first time
        return name + " - imported (1)";
    }
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
 
export {
  getCurrentRealmPath,
  getTenantURL,
  applyNameCollisionPolicy,
  replaceAll,
};