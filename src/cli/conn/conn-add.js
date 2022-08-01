import { Command, Option } from 'commander';
import * as common from '../cmd_common.js';
import storage from '../../storage/SessionStorage.js';
import { saveConnectionProfile } from '../../ops/ConnectionProfileOps.js';
import { getTokens } from '../../ops/AuthenticateOps.js';
import { printMessage } from '../../ops/utils/Console.js';

const program = new Command('frodo conn add');

program
  .description(
    'Add a new connection profiles. You have to specify a URL, username and password at a minimum.\nOptionally, for Identity Cloud, you can also add a log API key and secret.'
  )
  .helpOption('-h, --help', 'Help')
  .showHelpAfterError()
  .addArgument(common.hostArgumentM)
  .addArgument(common.userArgument)
  .addArgument(common.passwordArgument)
  .addArgument(common.apiKeyArgument)
  .addArgument(common.apiSecretArgument)
  .addOption(common.deploymentOption)
  .addOption(common.insecureOption)
  .addOption(new Option('--no-validate', 'Do not validate connection.'))
  .action(
    // implement command logic inside action handler
    async (host, user, password, key, secret, options) => {
      storage.session.setTenant(host);
      storage.session.setUsername(user);
      storage.session.setPassword(password);
      storage.session.setLogApiKey(key);
      storage.session.setLogApiSecret(secret);
      storage.session.setDeploymentType(options.type);
      storage.session.setAllowInsecureConnection(options.insecure);
      if ((options.validate && (await getTokens())) || !options.validate) {
        saveConnectionProfile();
      } else {
        process.exitCode = 1;
      }
    }
    // end command logic inside action handler
  );

program.parse();
