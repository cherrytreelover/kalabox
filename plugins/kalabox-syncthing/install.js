'use strict';

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Kalabox modules
  var meta = require('./meta.js');
  var util = require('./util.js')(kbox);
  var share = kbox.share;
  var packed = kbox.core.deps.get('prepackaged');
  var provisioned = kbox.core.deps.get('globalConfig').provisioned;

  /*
   * We only need to turn syncthing off if we plan on updateing it
   */
  if (util.needsBinUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-off';
      step.deps = ['core-auth'];
      step.description = 'Making sure syncthing is not running...';
      step.all = function(state, done) {

        // Get the local syncthing instanced
        share.getLocalSync()

        // Check to see if it is running
        .then(function(localSync) {
          return localSync.isUp()

          // If it is then SHUT IT DOWNWWWW
          .then(function(isUp) {
            if (isUp) {
              return localSync.shutdown();
            }
          });
        })

        // Next step
        .nodeify(done);

      };
    });
  }

  /*
   * If we need to do updates or install syncthing for the first time
   * then run this step FOR SURE
   */
  if ((!packed && !provisioned) && (util.needsBinUp() || util.needsImgUp())) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-downloads';
      step.description = 'Queuing up syncthing downloads...';
      step.subscribes = ['core-downloads'];
      step.deps = ['core-auth'];
      step.all = function(state) {

        // We only need this if we need to update the local binary
        if (util.needsBinUp()) {
          state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
        }

        // We need this regardless
        state.downloads.push(meta.SYNCTHING_CONFIG_URL);

      };
    });
  }

  /*
   * If we need to do updates then we will need to install our syncthing
   * binary again
   */
  if (util.needsBinUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-setup';
      step.description = 'Setting up syncthing...';
      step.deps = ['core-downloads'];
      step.all = function(state) {

        // Install the syncthing binary
        util.installSyncthing(state.config.sysConfRoot);

        // Update our current install to reflect that
        state.updateCurrentInstall({SYNCTHING_BINARY: '0.11.22'});

      };
    });
  }

/*
  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-image';
    step.deps = ['engine-up'];
    step.description = 'Installing your Syncthing image...';
    step.all = function(state, done) {
      kbox.engine.build({name: 'syncthing'}, function(err) {
        if (err) {
          state.status = false;
          done(err);
        } else {
          done();
        }
      });
    };
  });
*/

};
