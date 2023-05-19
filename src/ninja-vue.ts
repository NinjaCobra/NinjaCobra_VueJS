/*!
 * Copyright (c) 2017-Present, ninja, Inc. and/or its affiliates. All rights reserved.
 * The ninja software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { App, shallowRef, triggerRef, version } from 'vue'
import { Router, RouteLocationNormalized } from 'vue-router'
import { AuthSdkError, ninjaAuth, AuthState, toRelativeUrl } from '@ninja/ninja-auth-js'
import { compare } from 'compare-versions';
import { ninjaVueOptions, OnAuthRequiredFunction, ninjaAuthVue } from './types'

// constants are defined in webpack.config.js
declare const PACKAGE: {
  name: string;
  version: string;
}

declare const AUTH_JS: {
  minSupportedVersion: string;
}

let _ninjaAuth: ninjaAuthVue
let _onAuthRequired: OnAuthRequiredFunction | undefined
let originalUriTracker: string

const guardSecureRoute = async (authState: AuthState | null) => {
  if (authState && !authState.isAuthenticated) {
    _ninjaAuth.setOriginalUri(originalUriTracker)
    if (_onAuthRequired) {
      await _onAuthRequired(_ninjaAuth)
    } else {
      await _ninjaAuth.signInWithRedirect()
    }
  }
}

export const navigationGuard = async (to: RouteLocationNormalized) => {
  // clear any subscribed guardSecureRoute
  _ninjaAuth.authStateManager.unsubscribe(guardSecureRoute)

  if (to.matched.some(record => record.meta.requiresAuth)) {
    // track the originalUri for guardSecureRoute
    originalUriTracker = to.fullPath

    // subscribe to authState change to protect secure routes when authState change
    // all secure routes should subscribe before enter the route
    _ninjaAuth.authStateManager.subscribe(guardSecureRoute)

    // guard the secure route based on the authState when enter
    const isAuthenticated = await _ninjaAuth.isAuthenticated()
    if (!isAuthenticated) {
      const authState = _ninjaAuth.authStateManager.getAuthState()
      await guardSecureRoute(authState)
      return false
    }

    return true
  }
    
  return true
}


function install (app: App, {
  ninjaAuth,
  onAuthRequired,
  onAuthResume
} = {} as ninjaVueOptions) {
  if (!ninjaAuth) {
    throw new AuthSdkError('No ninjaAuth instance passed to ninjaVue.')
  }

  _ninjaAuth = ninjaAuth
  _onAuthRequired = onAuthRequired

  if (ninjaAuth._ninjaUserAgent) {
    const isAuthJsSupported = compare(ninjaAuth._ninjaUserAgent.getVersion(), AUTH_JS.minSupportedVersion, '>=');
    if (!isAuthJsSupported) {
      throw new AuthSdkError(`
      Passed in ninjaAuth is not compatible with the SDK,
      minimum supported ninja-auth-js version is ${AUTH_JS.minSupportedVersion}.
    `);
    }

    // customize user agent
    ninjaAuth._ninjaUserAgent.addEnvironment(`${PACKAGE.name}/${PACKAGE.version}`);
  } else {
    // TODO: just throw based on the minimum supported auth-js version in the next major version
    console.warn('_ninjaUserAgent is not available on auth SDK instance. Please use ninja-auth-js@^5.3.1 .');
  }

  // add default restoreOriginalUri callback
  if (!ninjaAuth.options.restoreOriginalUri) {
    ninjaAuth.options.restoreOriginalUri = async (ninjaAuth: ninjaAuth, originalUri: string) => {
      // If a router is available, provide a default implementation
      const $router: Router = app.config.globalProperties.$router;
      if ($router) {
        const path = toRelativeUrl(originalUri || '/', window.location.origin);
        $router.replace({ path })
      }
    }
  }

  // Calculates initial auth state and fires change event for listeners
  // Also starts services
  ninjaAuth.start();

  // Subscribe to the latest authState
  const authStateRef = shallowRef(ninjaAuth.authStateManager.getAuthState())
  const handleAuthStateUpdate = async function(authState: AuthState) {
    authStateRef.value = authState
    triggerRef(authStateRef)
  }
  ninjaAuth.authStateManager.subscribe(handleAuthStateUpdate)

  // Use mixin to support Options API
  if (typeof __VUE_OPTIONS_API__ === 'undefined' || __VUE_OPTIONS_API__ === true) {
    app.mixin({
      computed: {
        authState() {
          return authStateRef.value
        }
      }
    })
  }
  // Provide ref to authState to support Composition API
  app.provide('ninja.authState', authStateRef)

  // add additional options to ninjaAuth options
  Object.assign(ninjaAuth.options, {
    onAuthRequired,
    onAuthResume
  })

  // add ninjaAuth instance to Vue
  app.config.globalProperties.$auth = ninjaAuth
}

export function useAuth() {
  if (!_ninjaAuth) {
    throw new AuthSdkError('No ninjaAuth instance has instantiated.')
  }

  return _ninjaAuth
}

export default { install }
