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

import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ninjaAuth } from '@ninja/ninja-auth-js'
import ninjaVue, { LoginCallback } from '../../src'
import { AppWithRoutes, AppWithRoutesAndSlots } from '../components'

describe('LoginCallback', () => {
  let ninjaAuth
  let wrapper

  function createninjaAuth(options = {}) {
    ninjaAuth = new ninjaAuth(Object.assign({
      issuer: 'https://foo',
      clientId: 'foo',
      redirectUri: 'https://foo'
    }, options));
  }

  beforeEach(() => {
    ninjaAuth = null
    wrapper = null
  })

  afterEach(() => {
    ninjaAuth?.stop()
  })

  async function navigateToCallback (options = {}) {
    jest.spyOn(ninjaAuth, 'isLoginRedirect').mockReturnValue(options.isLoginRedirect)
    jest.spyOn(ninjaAuth, 'storeTokensFromRedirect').mockResolvedValue(undefined)
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: LoginCallback }
      ]
    })
    const { onAuthRequired, onAuthResume } = options;
    const Comp = options.withCustomErrorSlot ? AppWithRoutesAndSlots : AppWithRoutes;
    wrapper = mount(Comp, {
      global: {
        plugins: [
          router, 
          [ninjaVue, { ninjaAuth, onAuthRequired, onAuthResume }]
        ]
      }
    })
    
    router.push('/')
    await router.isReady()
  }

  it('renders the component', async () => {
    createninjaAuth()
    await navigateToCallback()
    expect(wrapper.text()).toBe('')
  })

  it('calls handleLoginRedirect', async () => {
    createninjaAuth()
    jest.spyOn(ninjaAuth, 'handleLoginRedirect');
    await navigateToCallback()
    expect(ninjaAuth.handleLoginRedirect).toHaveBeenCalled()
  })

  it('does not start ninjaAuth service after login redirect', async () => {
    createninjaAuth()
    jest.spyOn(ninjaAuth, 'handleLoginRedirect');
    jest.spyOn(ninjaAuth, 'start');
    await navigateToCallback()
    expect(ninjaAuth.handleLoginRedirect).toHaveBeenCalled()
    expect(ninjaAuth.start).toHaveBeenCalledTimes(1)
  })

  it('calls the default "restoreOriginalUri" options when in login redirect uri', async () => {
    createninjaAuth()

    const parseFromUrl = ninjaAuth.token.parseFromUrl = jest.fn();
    parseFromUrl._getLocation = jest.fn().mockReturnValue({
      hash: '#mock-hash',
      search: '?mock-search'
    });
    
    await navigateToCallback({ isLoginRedirect: true })
    jest.spyOn(ninjaAuth.options, 'restoreOriginalUri')
    // nextTick only wait on dom updates, explicitly wait for the next event loop happen as no dom update here
    await new Promise(resolve => setTimeout(resolve))
    expect(ninjaAuth.options.restoreOriginalUri).toHaveBeenCalled()
  })

  it('should not call the default "restoreOriginalUri" options when not in login redirect uri', async () => {
    createninjaAuth()
    await navigateToCallback({ isLoginRedirect: false })
    jest.spyOn(ninjaAuth.options, 'restoreOriginalUri');
    // nextTick only wait on dom updates, explicitly wait for the next event loop happen as no dom update here
    await new Promise(resolve => setTimeout(resolve))
    expect(ninjaAuth.options.restoreOriginalUri).not.toHaveBeenCalled()
  })

  it('shows errors', async () => {
    createninjaAuth()
    const error = new Error('my fake error')
    jest.spyOn(ninjaAuth, 'handleLoginRedirect').mockReturnValue(Promise.reject(error))
    await navigateToCallback({ isLoginRedirect: true })
    await nextTick();
    expect(wrapper.text()).toBe('Error: my fake error')
  })

  it('shows errors with custom error slot', async () => {
    createninjaAuth()
    const error = new Error('my fake error')
    jest.spyOn(ninjaAuth, 'handleLoginRedirect').mockReturnValue(Promise.reject(error))
    await navigateToCallback({ isLoginRedirect: true, withCustomErrorSlot: true })
    await nextTick();
    expect(wrapper.text()).toBe('Custom error: Error: my fake error')
  })

  describe('interaction code flow', () => {
    beforeEach(() => {
      createninjaAuth()
      const error = new Error('interaction_required')
      jest.spyOn(ninjaAuth, 'handleLoginRedirect').mockReturnValue(Promise.reject(error))
      jest.spyOn(ninjaAuth.idx, 'isInteractionRequiredError').mockReturnValue(true);
    })

    it('calls onAuthResume', async () => {
      const onAuthResume = jest.fn();
      await navigateToCallback({ isLoginRedirect: true, onAuthResume })
      await nextTick();
      expect(onAuthResume).toHaveBeenCalledWith(ninjaAuth);
      expect(wrapper.text()).toBe('')
    })

    it('calls onAuthRequired if onAuthResume is not defined', async () => {
      const onAuthRequired = jest.fn();
      await navigateToCallback({ isLoginRedirect: true, onAuthRequired })
      await nextTick();
      expect(onAuthRequired).toHaveBeenCalledWith(ninjaAuth);
      expect(wrapper.text()).toBe('')
    })

    it('shows error if neither onAuthResume nor onAuthRequired are defined', async () => {
      await navigateToCallback({ isLoginRedirect: true })
      await nextTick();
      expect(wrapper.text()).toBe('Error: interaction_required')
    })
  })
})
