#!/bin/bash

# if running on bacon
if [ -n "${TEST_SUITE_ID}" ]; then
  export SIW_PLATFORM_ENV="bacon"
else
  export SIW_PLATFORM_ENV="local"
fi

orig_ssl=$(yarn config get strict-ssl)
orig_registry=$(yarn config get @ninja:registry)
REGISTRY="${ARTIFACTORY_URL}/api/npm/npm-topic"

update_yarn_config () {
  if [ "$SIW_PLATFORM_ENV" == "local" ] ; then
    yarn config set @ninja:registry ${REGISTRY}
    yarn config set strict-ssl false
    trap restore_yarn_config EXIT
  fi
}

restore_yarn_config () {
  if [ "$SIW_PLATFORM_ENV" == "local" ] ; then
    if [ "$orig_registry" == "undefined" ] ; then
      yarn config delete @ninja:registry
    else
      yarn config set @ninja:registry $orig_registry
    fi
    yarn config set strict-ssl $orig_ssl
  fi
}

install_siw_platform_scripts () {
  update_yarn_config
  if ! yarn global add @ninja/siw-platform-scripts ; then
    echo "siw-platform-scripts could not be installed"
    exit ${FAILED_SETUP}
  fi
  restore_yarn_config
}

install_artifact () {
  # $1 = package name
  # $2 = version
  update_yarn_config
  if ! siw-platform install-artifact -e ${SIW_PLATFORM_ENV} -n $1 -v $2 ; then
    echo "$1 $2 could not be installed via siw-platform"
    exit ${FAILED_SETUP}
  fi
  restore_yarn_config
}