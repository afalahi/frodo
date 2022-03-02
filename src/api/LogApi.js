import { generateLogApi } from './BaseApi.js';
import { getTenantURL } from './utils/ApiUtils.js';
import { saveConnection } from './AuthApi.js';
import storage from '../storage/SessionStorage.js';
import util from 'util';

const misc_noise = [
    'text/plain',
    'com.iplanet.dpro.session.operations.ServerSessionOperationStrategy',
    'com.iplanet.dpro.session.SessionIDFactory',
    'com.iplanet.dpro.session.share.SessionEncodeURL',
    'com.iplanet.services.naming.WebtopNaming',
    'com.iplanet.sso.providers.dpro.SSOProviderImpl',
    'com.sun.identity.authentication.AuthContext',
    'com.sun.identity.authentication.client.AuthClientUtils',
    'com.sun.identity.authentication.config.AMAuthConfigType',
    'com.sun.identity.authentication.config.AMAuthenticationManager',
    'com.sun.identity.authentication.config.AMAuthLevelManager',
    'com.sun.identity.authentication.config.AMConfiguration',
    'com.sun.identity.authentication.jaas.LoginContext',
    'com.sun.identity.authentication.modules.application.Application',
    'com.sun.identity.authentication.server.AuthContextLocal',
    'com.sun.identity.authentication.service.AMLoginContext',
    'com.sun.identity.authentication.service.AuthContextLookup',
    'com.sun.identity.authentication.service.AuthD',
    'com.sun.identity.authentication.service.AuthUtils',
    'com.sun.identity.authentication.service.DSAMECallbackHandler',
    'com.sun.identity.authentication.service.LoginState',
    'com.sun.identity.authentication.spi.AMLoginModule',
    'com.sun.identity.delegation.DelegationEvaluatorImpl',
    'com.sun.identity.idm.plugins.internal.AgentsRepo',
    'com.sun.identity.idm.server.IdCachedServicesImpl',
    'com.sun.identity.idm.server.IdRepoPluginsCache',
    'com.sun.identity.idm.server.IdServicesImpl',
    'com.sun.identity.log.spi.ISDebug',
    'com.sun.identity.shared.encode.CookieUtils',
    'com.sun.identity.sm.ldap.SMSLdapObject',
    'com.sun.identity.sm.CachedSMSEntry',
    'com.sun.identity.sm.CachedSubEntries',
    'com.sun.identity.sm.DNMapper',
    'com.sun.identity.sm.ServiceConfigImpl',
    'com.sun.identity.sm.ServiceConfigManagerImpl',
    'com.sun.identity.sm.SMSEntry',
    'com.sun.identity.sm.SMSUtils',
    'com.sun.identity.sm.SmsWrapperObject',
    'oauth2',
    'org.apache.http.client.protocol.RequestAuthCache',
    'org.apache.http.impl.conn.PoolingHttpClientConnectionManager',
    'org.apache.http.impl.nio.client.InternalHttpAsyncClient',
    'org.apache.http.impl.nio.client.InternalIODispatch',
    'org.apache.http.impl.nio.client.MainClientExec',
    'org.apache.http.impl.nio.conn.ManagedNHttpClientConnectionImpl',
    'org.apache.http.impl.nio.conn.PoolingNHttpClientConnectionManager',
    'org.forgerock.audit.AuditServiceImpl',
    'org.forgerock.oauth2.core.RealmOAuth2ProviderSettings',
    'org.forgerock.openam.authentication.service.JAASModuleDetector',
    'org.forgerock.openam.authentication.service.LoginContextFactory',
    'org.forgerock.openam.blacklist.BloomFilterBlacklist',
    'org.forgerock.openam.blacklist.CTSBlacklist',
    'org.forgerock.openam.core.realms.impl.CachingRealmLookup',
    'org.forgerock.openam.core.rest.authn.RestAuthCallbackHandlerManager',
    'org.forgerock.openam.core.rest.authn.trees.AuthTrees',
    'org.forgerock.openam.cors.CorsFilter',
    'org.forgerock.openam.cts.CTSPersistentStoreImpl',
    'org.forgerock.openam.cts.impl.CoreTokenAdapter',
    'org.forgerock.openam.cts.impl.queue.AsyncResultHandler',
    'org.forgerock.openam.cts.reaper.ReaperDeleteOnQueryResultHandler',
    'org.forgerock.openam.headers.DisableSameSiteCookiesFilter',
    'org.forgerock.openam.idrepo.ldap.DJLDAPv3Repo',
    'org.forgerock.openam.rest.CsrfFilter',
    'org.forgerock.openam.rest.restAuthenticationFilter',
    'org.forgerock.openam.rest.fluent.CrestLoggingFilter',
    'org.forgerock.openam.session.cts.CtsOperations',
    'org.forgerock.openam.session.stateless.StatelessSessionManager',
    'org.forgerock.openam.sm.datalayer.impl.ldap.ExternalLdapConfig',
    'org.forgerock.openam.sm.datalayer.impl.ldap.LdapQueryBuilder',
    'org.forgerock.openam.sm.datalayer.impl.SeriesTaskExecutor',
    'org.forgerock.openam.sm.datalayer.impl.SeriesTaskExecutorThread',
    'org.forgerock.openam.sm.datalayer.providers.LdapConnectionFactoryProvider',
    'org.forgerock.openam.sm.file.ConfigFileSystemHandler',
    'org.forgerock.openam.social.idp.SocialIdentityProviders',
    'org.forgerock.openam.utils.ClientUtils',
    'org.forgerock.opendj.ldap.CachedConnectionPool',
    'org.forgerock.opendj.ldap.LoadBalancer',
    'org.forgerock.secrets.keystore.KeyStoreSecretStore',
    'org.forgerock.secrets.propertyresolver.PropertyResolverSecretStore',
    'org.forgerock.secrets.SecretsProvider'
]

const journeys_noise = [
    'org.forgerock.openam.auth.trees.engine.AuthTreeExecutor'
]

const journeys = [
    'org.forgerock.openam.auth.nodes.SelectIdPNode',
    'org.forgerock.openam.auth.nodes.ValidatedPasswordNode',
    'org.forgerock.openam.auth.nodes.ValidatedUsernameNode',
    'org.forgerock.openam.auth.trees.engine.AuthTreeExecutor'
]

const saml_noise = [
    'com.sun.identity.cot.COTCache',
    'com.sun.identity.plugin.configuration.impl.ConfigurationInstanceImpl',
    'com.sun.identity.saml2.meta.SAML2MetaCache',
    'com.sun.identity.saml2.profile.CacheCleanUpRunnable',
    'org.apache.xml.security.keys.KeyInfo',
    'org.apache.xml.security.signature.XMLSignature',
    'org.apache.xml.security.utils.SignerOutputStream',
    'org.apache.xml.security.utils.resolver.ResourceResolver',
    'org.apache.xml.security.utils.resolver.implementations.ResolverFragment',
    'org.apache.xml.security.algorithms.JCEMapper',
    'org.apache.xml.security.algorithms.implementations.SignatureBaseRSA',
    'org.apache.xml.security.algorithms.SignatureAlgorithm',
    'org.apache.xml.security.utils.ElementProxy',
    'org.apache.xml.security.transforms.Transforms',
    'org.apache.xml.security.utils.DigesterOutputStream',
    'org.apache.xml.security.signature.Reference',
    'org.apache.xml.security.signature.Manifest'
]

const saml = [
    'jsp.saml2.spAssertionConsumer',
    'com.sun.identity.saml.common.SAMLUtils',
    'com.sun.identity.saml2.common.SAML2Utils',
    'com.sun.identity.saml2.meta.SAML2MetaManager',
    'com.sun.identity.saml2.xmlsig.FMSigProvider'
]

const noise = misc_noise.concat(saml_noise).concat(journeys_noise)

const logsTailURLTemplate = "%s/monitoring/logs/tail?source=%s";
const logsSourcesURLTemplate = "%s/monitoring/logs/sources";

async function tail(source, cookie) {
    try {
        let urlString = util.format(logsTailURLTemplate, getTenantURL(storage.session.getTenant()), encodeURIComponent(source));
        if (cookie) {
            urlString += `&_pagedResultsCookie=${encodeURIComponent(cookie)}`;
        }
        const response = await generateLogApi().get(urlString);
        if (response.status < 200 || response.status > 399) {
            console.error("tail ERROR: tail call returned %d", response.status);
            return null;
        }
        let logsObject = response.data;
        if (Array.isArray(logsObject.result)) {
            logsObject.result.filter(el => {
                (!noise.includes(el.payload.logger) && !noise.includes(el.type))
            });
        }
        return logsObject;
    } catch (e) {
        console.error("tail ERROR: tail data error - ", e);
        return null;
    }
}

export async function tailLogs(source, cookie) {
    const result = await tail(source, cookie);
    if(!cookie && result.result) {
        await saveConnection();
    }
    result.result.forEach(e => {
        console.log(JSON.stringify(e.payload));
    });
    setTimeout(function () {
        tailLogs(source, result.pagedResultsCookie)
    }, 5000);
}

export async function getSources() {
    try {
        const urlString = util.format(logsSourcesURLTemplate, getTenantURL(storage.session.getTenant()));
        const response = await generateLogApi().get(urlString);
        if (response.status < 200 || response.status > 399) {
            console.error("getSources ERROR: get log sources call returned %d", response.status);
            return null;
        }
        // await saveConnection();
        return response.data;
    } catch (e) {
        console.error("getSources ERROR: get log sources data error - ", e.message);
        return null;
    }
}