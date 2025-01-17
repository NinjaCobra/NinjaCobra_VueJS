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

import { mount } from '@vue/test-utils'
import waitForExpect from 'wait-for-expect'
import { createRouter, createWebHistory } from 'vue-router'
import { ninjaAuth } from '@ninja/ninja-auth-js'
import ninjaVue, { navigationGuard } from '../../src/ninja-vue'
import { AppWithRoutes, Protected } from '../components'

describe('NavigationGuard', () => {
  let ninjaAuth
  let wrapper
  let router
  let onAuthRequired

  function setupninjaAuth () {
    ninjaAuth = new ninjaAuth({
      issuer: 'https://foo',
      clientId: 'foo',
      redirectUri: 'https://foo'
    })

    // initial general mocks
    ninjaAuth.authStateManager.updateAuthState = jest.fn()
    ninjaAuth.setOriginalUri = jest.fn()
    ninjaAuth.signInWithRedirect = jest.fn()
  }

  function bootstrap (options = {}) {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          component: {
            template: 'Home'
          }
        },
        {
          path: '/protected',
          component: Protected,
          meta: { requiresAuth: true }
        }
      ]
    })
    router.beforeEach(navigationGuard)
    
    wrapper = mount(AppWithRoutes, {
      global: {
        plugins: [
          router,
          [ninjaVue, { ninjaAuth, ...options }]
        ]
      }
    })
  }

  beforeEach(() => {
    setupninjaAuth()
    onAuthRequired = jest.fn()
  })

  describe('enter protected route', () => {
    it('should show protected component when authed', async () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: true
      })
      ninjaAuth.isAuthenticated = jest.fn().mockResolvedValue(true)
      bootstrap()
      router.push({ path: '/protected' })
      await router.isReady()
      const el = wrapper.get('[data-test="protected"]')
      expect(el.text()).toBe('protected')
    })

    it('should call signInWithRedirect when not authed', async () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: false
      })
      bootstrap()
      router.push({ path: '/protected' })
      await waitForExpect(() => {
        expect(ninjaAuth.setOriginalUri).toHaveBeenCalledWith('/protected')
        expect(ninjaAuth.signInWithRedirect).toHaveBeenCalled()
        expect(wrapper.findAll('[data-test="protected"]')).toHaveLength(0)
      })
    })

    it('should call onAuthRequired if provided from config when not authed', async () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: false
      })
      bootstrap({ onAuthRequired })
      router.push({ path: '/protected' })
      await waitForExpect(() => {
        expect(ninjaAuth.setOriginalUri).toHaveBeenCalledWith('/protected')
        expect(onAuthRequired).toHaveBeenCalled()
      })
    })
  })

  describe('authState change when already in the protected route', () => {
    beforeEach(async () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: true
      })
      ninjaAuth.isAuthenticated = jest.fn().mockResolvedValue(true)
    })

    it('should call signInWithRedirect', async () => {
      bootstrap()
      // enter /protected
      router.push({ path: '/protected' })
      await router.isReady()
      // change authState
      ninjaAuth.emitter.emit('authStateChange', {
        isAuthenticated: false
      })
      await waitForExpect(() => {
        expect(ninjaAuth.setOriginalUri).toHaveBeenCalledWith('/protected')
        expect(ninjaAuth.signInWithRedirect).toHaveBeenCalled()
      })
    })

    it('should call onAuthRequired if provided', async () => {
      bootstrap({ onAuthRequired })
      // enter /protected
      router.push({ path: '/protected' })
      await router.isReady()
      // change authState
      ninjaAuth.emitter.emit('authStateChange', {
        isAuthenticated: false
      })
      await waitForExpect(() => {
        expect(ninjaAuth.setOriginalUri).toHaveBeenCalledWith('/protected')
        expect(onAuthRequired).toHaveBeenCalled()
        expect(ninjaAuth.signInWithRedirect).not.toHaveBeenCalled()
      })
    })
  })

})
