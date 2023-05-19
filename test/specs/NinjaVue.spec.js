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
import { AuthSdkError, ninjaAuth } from '@ninja/ninja-auth-js'
import { createRouter, createWebHistory } from 'vue-router'
import ninjaVue from '../../src/ninja-vue'
import { App } from '../components'

const pkg = require('../../package.json')

describe('ninjaVue', () => {
  let ninjaAuth
  let wrapper
  let mockRouter
  let originalConsole

  function setupninjaAuth () {
    ninjaAuth = new ninjaAuth({
      issuer: 'https://foo',
      clientId: 'foo',
      redirectUri: 'https://foo'
    })
  }

  function bootstrap (options = {}) {
    mockRouter = createRouter({
      history: createWebHistory(),
      routes: [
      ]
    })
    mockRouter.replace = jest.fn()
    wrapper = mount(App, {
      global: {
        plugins: [
          [ninjaVue, { ninjaAuth, ...options }],
          mockRouter,
        ],
      }
    })
  }

  beforeEach(() => {
    originalConsole = global.console
    global.console = {
      warn: jest.fn()
    }
    setupninjaAuth()
  })

  afterEach(() => {
    global.console = originalConsole
  })

  it('should add environment to ninjaAuth\'s _ninjaUserAgent', () => {
    bootstrap()
    const userAgent = wrapper.vm.$auth._ninjaUserAgent.getHttpHeader()['X-ninja-User-Agent-Extended'];
    expect(
      userAgent.indexOf(`${pkg.name}/${pkg.version}`)
    ).toBeGreaterThan(-1);
  })

  it('should not throw when provided ninjaAuth instance greater or equal than minimum supported version', () => {
    ninjaAuth._ninjaUserAgent.getVersion = jest.fn().mockReturnValue('5.3.1');
    expect(() => bootstrap()).not.toThrow(AuthSdkError);
    ninjaAuth._ninjaUserAgent.getVersion = jest.fn().mockReturnValue('5.8.0');
    expect(() => bootstrap()).not.toThrow(AuthSdkError);
    ninjaAuth._ninjaUserAgent.getVersion = jest.fn().mockReturnValue('6.0.0');
    expect(() => bootstrap()).not.toThrow(AuthSdkError);
  })

  it('throws when provided ninjaAuth instance less than minimum supported version', () => {
    ninjaAuth._ninjaUserAgent.getVersion = jest.fn().mockReturnValue('1.0.0');
    expect(() => bootstrap()).toThrow(AuthSdkError);
  })

  it('logs warning when ninjaAuth._ninjaUserAgent is not available', () => {
    delete ninjaAuth._ninjaUserAgent;
    bootstrap();
    expect(global.console.warn).toHaveBeenCalledWith('_ninjaUserAgent is not available on auth SDK instance. Please use ninja-auth-js@^5.3.1 .');
  });

  describe('restoreOriginalUri', () => {
    const mockOriginalUri = 'http://localhost/fakepath'
    it('should call restoreOriginalUri callback if provided when calls restoreOriginalUri', () => {
      ninjaAuth.options.restoreOriginalUri = jest.fn()
      bootstrap()
      wrapper.vm.$auth.options.restoreOriginalUri(ninjaAuth, mockOriginalUri)
      expect(ninjaAuth.options.restoreOriginalUri).toHaveBeenCalledWith(ninjaAuth, mockOriginalUri)
    })

    it('should call default implementation when restoreOriginalUri callback is not provided', () => {
      bootstrap()
      wrapper.vm.$auth.options.restoreOriginalUri(ninjaAuth, mockOriginalUri)
      expect(mockRouter.replace).toHaveBeenCalledWith({ path: '/fakepath' })
    })
  })

  it('should has authState property in app instance', () => {
    bootstrap()
    expect(wrapper.vm.authState).toBeDefined()
  })

  describe('render based on authState', () => {
    it('should render "pending" when initial mount, then render not authenticated after authState update', async () => {
      bootstrap()
      expect(wrapper.find('#state').text()).toBe('pending')
      await waitForExpect(() => {
        expect(wrapper.find('#state').text()).toBe('not authenticated')
      })
    })

    it('should render "authenticated" when authState.isAuthenticated is true', () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: true
      })
      bootstrap()
      expect(wrapper.find('#state').text()).toBe('authenticated')
    })

    it('should render "not authenticated" when authState.isAuthenticated is false', () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: false
      })
      bootstrap()
      expect(wrapper.find('#state').text()).toBe('not authenticated')
    })

    it('should render based on preset authState from ninjaAuth', () => {
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: false
      })
      ninjaAuth.authStateManager.updateAuthState = jest.fn()
      bootstrap()
      expect(wrapper.find('#state').text()).toBe('not authenticated')

      // reset modified auth-js' userAgent
      setupninjaAuth()
      ninjaAuth.authStateManager.getAuthState = jest.fn().mockReturnValue({
        isAuthenticated: true
      })
      ninjaAuth.authStateManager.updateAuthState = jest.fn()
      bootstrap()
      expect(wrapper.find('#state').text()).toBe('authenticated')
    })
  })

  it('should call service start, but not stop', () => {
    ninjaAuth.start = jest.fn()
    ninjaAuth.stop = jest.fn()
    bootstrap()
    wrapper.unmount()
    expect(ninjaAuth.start).toHaveBeenCalled()
    expect(ninjaAuth.stop).not.toHaveBeenCalled()
  })

})
