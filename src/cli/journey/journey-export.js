import { Command, Option } from 'commander';
import * as common from '../cmd_common.js';
import { getTokens } from '../../ops/AuthenticateOps.js';
import {
  exportJourneyToFile,
  exportJourneysToFile,
  exportJourneysToFiles,
} from '../../ops/JourneyOps.js';
import storage from '../../storage/SessionStorage.js';
import { printMessage } from '../../ops/utils/Console.js';

const program = new Command('frodo journey export');

program
  .description('Export journeys/trees.')
  .helpOption('-h, --help', 'Help')
  .showHelpAfterError()
  .addArgument(common.hostArgumentM)
  .addArgument(common.realmArgument)
  .addArgument(common.userArgument)
  .addArgument(common.passwordArgument)
  .addOption(common.deploymentOption)
  .addOption(common.insecureOption)
  .addOption(
    new Option(
      '-i, --journey-id <journey>',
      'Name of a journey/tree. If specified, -a and -A are ignored.'
    )
  )
  .addOption(
    new Option(
      '-f, --file <file>',
      'Name of the file to write the exported journey(s) to. Ignored with -A.'
    )
  )
  .addOption(
    new Option(
      '-a, --all',
      'Export all the journeys/trees in a realm. Ignored with -i.'
    )
  )
  .addOption(
    new Option(
      '-A, --all-separate',
      'Export all the journeys/trees in a realm as separate files <journey/tree name>.json. Ignored with -i or -a.'
    )
  )
  .addOption(
    new Option(
      '--use-string-arrays',
      'Where applicable, use string arrays to store multi-line text (e.g. scripts).'
    ).default(false, 'off')
  )
  .action(
    // implement command logic inside action handler
    async (host, realm, user, password, options) => {
      storage.session.setTenant(host);
      storage.session.setRealm(realm);
      storage.session.setUsername(user);
      storage.session.setPassword(password);
      storage.session.setDeploymentType(options.type);
      storage.session.setAllowInsecureConnection(options.insecure);
      if (await getTokens()) {
        // export
        if (options.journeyId) {
          printMessage('Exporting journey...');
          exportJourneyToFile(options.journeyId, options.file, {
            useStringArrays: options.useStringArrays,
          });
        }
        // --all -a
        else if (options.all) {
          printMessage('Exporting all journeys to a single file...');
          exportJourneysToFile(options.file, {
            useStringArrays: options.useStringArrays,
          });
        }
        // --all-separate -A
        else if (options.allSeparate) {
          printMessage('Exporting all journeys to separate files...');
          exportJourneysToFiles({
            useStringArrays: options.useStringArrays,
          });
        }
        // unrecognized combination of options or no options
        else {
          printMessage('Unrecognized combination of options or no options...');
          program.help();
        }
      }
    }
    // end command logic inside action handler
  );

program.parse();
