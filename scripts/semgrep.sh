#!/bin/bash

set -eo pipefail

cd ${ninja_HOME}/${REPO}

if ! sast_scan;
then
  exit ${FAILURE}
fi

exit ${SUCCESS}