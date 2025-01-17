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
import { ninjaAuth } from '@ninja/ninja-auth-js'
import ninjaVue, { LoginCallback, navigationGuard, useAuth } from '../../src'
import InternalLoginCallback from '../../src/components/LoginCallback'
import { navigationGuard as internalNavigationGuard } from '../../src/ninja-vue'

const baseConfig = {
  issuer: 'https://foo',
  clientId: 'foo',
  redirectUri: 'foo'
}

describe('ninjaVue module', () => {
  test('is a Vue plugin', () => {
    expect(ninjaVue.install).toBeTruthy()
  })
  test('sets an instance of Auth on Vue prototype', () => {
    const App = {
      template: '<div></div>'
    }
    const ninjaAuth = new ninjaAuth(baseConfig)
    const wrapper = mount(App, {
      global: {
        plugins: [
          [ninjaVue, { ninjaAuth }]
        ]
      }
    })
    expect(wrapper.vm.$auth instanceof ninjaAuth).toBeTruthy()
    const auth = useAuth()
    expect(wrapper.vm.$auth).toBe(auth)
  })
  test('exports "LoginCallback" component', () => {
    expect(LoginCallback).toBe(InternalLoginCallback)
  })
  test('exports "navigationGuard"', () => {
    expect(navigationGuard).toBe(internalNavigationGuard)
  })
})
