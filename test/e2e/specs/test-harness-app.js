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

import {
  HomePage,
  ProtectedPage,
  SessionTokenPage
} from '../page-objects/test-harness-app';

import ninjaSignInPageV1 from '../page-objects/ninja-signin-page';
import ninjaSignInPageOIE from '../page-objects/ninja-oie-signin-page';

let ninjaSignInPage = ninjaSignInPageV1;
if (process.env.ORG_OIE_ENABLED) {
  ninjaSignInPage = ninjaSignInPageOIE;
}

const { USERNAME, PASSWORD } = process.env;

describe('Vue + ninja App', () => {
  describe('Redirect Flow', () => {
    
    it('redirects to ninja for login when trying to access a protected page', async () => {
      await ProtectedPage.open();

      await ninjaSignInPage.waitForPageLoad();
      await ninjaSignInPage.login(USERNAME, PASSWORD);

      await ProtectedPage.waitForPageLoad();
      expect(await ProtectedPage.logoutButton.isExisting()).toBeTruthy();

      await ProtectedPage.userInfo.waitForDisplayed();
      const userInfo = await ProtectedPage.userInfo.getText();
      expect(userInfo).toContain('email');

      await ProtectedPage.logoutButton.click();
      await HomePage.waitForLogout();
    });

    it('redirects to ninja for login', async () => {
      await HomePage.open();
  
      await HomePage.waitForPageLoad();
      await HomePage.loginButton.click();
  
      await ninjaSignInPage.waitForPageLoad();
      await ninjaSignInPage.login(USERNAME, PASSWORD);
  
      await HomePage.logoutButton.waitForDisplayed({timeout: 20000});
      expect(await HomePage.logoutButton.isExisting()).toBeTruthy();
  
      await HomePage.logoutButton.click();
      await HomePage.waitForLogout();
    });

  });

  describe('Session Token Flow', () => {

    it('allows passing sessionToken to skip ninja login', async () => {
      await SessionTokenPage.open();

      await SessionTokenPage.waitForPageLoad();
      await SessionTokenPage.login(USERNAME, PASSWORD);

      await HomePage.logoutButton.waitForDisplayed({timeout: 20000});
      expect(await HomePage.logoutButton.isExisting()).toBeTruthy();

      // Logout
      await HomePage.logoutButton.click();
      await HomePage.waitForLogout();
    });

  });
});