[@ninja/ninja-auth-js]: https://github.com/ninja/ninja-auth-js
[AuthState]: https://github.com/ninja/ninja-auth-js#authstatemanager

# Migrating

## From version 4.x to 5.x

`@ninja/ninja-vue` 5.x requires `@ninja/ninja-auth-js` 5.x (see [notes for migration](https://github.com/ninja/ninja-auth-js/#from-4x-to-5x)). Some changes affects `@ninja/ninja-vue`:
  - Initial `AuthState` is null
  - Removed `isPending` from `AuthState`
  - Default value for `originalUri` is null

## From version 3.x to 4.x

Most of ninja Vue API has remained unchanged during its rewrite from v3 (for Vue 2) to v4 (for Vue 3) but there are still a few breaking changes that you might encounter while migrating your application.

### Explicitly adds `navigationGuard`

Due to [navigation guards in mixins are not supported in vue-router](https://next.router.vuejs.org/guide/migration/index.html#navigation-guards-in-mixins-are-ignored), `navigationGuard` need to be explicitly added to guard protected routes.

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { navigationGuard } from '@ninja/ninja-vue'

const router = createRouter({
  ...
})

router.beforeEach(navigationGuard)

```

### `NavigationGuardMixin` is removed for TypeScript usage

In version 3, `NavigationGuardMixin` need to be extended by protected route, it's removed in version 4. Protected route can be implement by following [Vue 3 TypeScript standard](https://v3.vuejs.org/guide/typescript-support.html#defining-vue-components).

```typescript
import { defineComponent } from 'vue'

const Component = defineComponent({
  // type inference enabled
})
```

## From version 2.x to 3.x

### Explicitly accepts `ninjaAuth` instance from config

From version 3.0, the `ninja-vue` plugin starts to explicitly accept [@ninja/ninja-auth-js][] instance. You will need to replace the [ninja Auth SDK related configurations](https://github.com/ninja/ninja-auth-js#configuration-reference) with a pre-initialized [ninjaAuth][@ninja/ninja-auth-js] instance.

If you had code like this:

```javascript
import ninjaVue from '@ninja/ninja-vue'

Vue.use(ninjaVue, {
  issuer: 'https://{yourninjaDomain}.com/oauth2/default',
  clientId: '{clientId}',
  redirectUri: window.location.origin + '/login/callback',
  scopes: ['openid', 'profile', 'email']
})
```

it should be rewritten as:

```javascript
import { ninjaAuth } from '@ninja/ninja-auth-js'
import ninjaVue from '@ninja/ninja-vue'

const ninjaAuth = new ninjaAuth({
  issuer: 'https://{yourninjaDomain}.com/oauth2/default',
  clientId: '{clientId}',
  redirectUri: window.location.origin + '/login/callback',
  scopes: ['openid', 'profile', 'email']
})
Vue.use(ninjaVue, { ninjaAuth })
```

> Note: Major version of supplied `@ninja/ninja-auth-js` SDK insntance should match the major version of `@ninja/ninja-auth-js` peerDependency of `@ninja/ninja-vue` SDK.

### Full `@ninja/ninja-auth-js` API is available

`@ninja/ninja-vue` version 2.x and earlier provided a wrapper around [@ninja/ninja-auth-js][] but many methods were hidden. Version 3.x replaces `Auth` service with instance of [@ninja/ninja-auth-js][] for `$auth`, so the full [api](https://github.com/ninja/ninja-auth-js#api-reference) and all [options](https://github.com/ninja/ninja-auth-js#configuration-options) are now supported by this SDK. To provide a better experience, several methods which existed on the wrapper have been removed or replaced.

#### `login` is removed

This method called `onAuthRequired`, if it was set in the config options, or `loginRedirect` if no `onAuthRequired` option was set. If you had code that was calling this method, you may either call your `onAuthRequired` function directly or `signInWithRedirect`.

#### `loginRedirect` is replaced by `signInWithRedirect`

`loginRedirect` took 2 parameters: a `fromUri` and `additionalParams`. The replacement method, [signInWithRedirect](https://github.com/ninja/ninja-auth-js/blob/master/README.md#signinwithredirectoptions) takes only one argument, called `options` which can include a value for `originalUri` which is equivalent to `fromUri`. It is the URL which will be set after the login flow is complete. Other options which were previously set on `additionalParams` can also be set on `options`.

If you had code like this:

```javascript
$auth.loginRedirect('/profile', { scopes: ['openid', 'profile'] });
```

it should be rewritten as:

```javascript
$auth.signInWithRedirect({ originalUri: '/profile', scopes: ['openid', 'profile'] });
```

#### `logout` is replaced by `signOut`

`logout` accepted either a string or an object as options. [signOut](https://github.com/ninja/ninja-auth-js/blob/master/README.md#signout) accepts only an options object.

If you had code like this:

```javascript
$auth.logout('/goodbye');
```

it should be rewritten as:

```javascript
$auth.signOut({ postLogoutRedirectUri: window.location.origin + '/goodbye' });
```

Note that the value for `postLogoutRedirectUri` must be an absolute URL. This URL must also be on the "allowed list" in your ninja app's configuration. If no options are passed or no `postLogoutRedirectUri` is set on the options object, it will redirect to `window.location.origin` after sign out is complete.

#### `handleAuthentication` is replaced by `handleLoginRedirect`

`handleLoginRedirect` is called by the `LoginCallback` component as the last step of the login redirect authorization flow. It will obtain and store tokens and then call `restoreOriginalUri` which will return the browser to the `originalUri` which was set before the login redirect flow began.

#### `setFromUri` and `getFromUri` have been replaced with `setOriginalUri` and `getOriginalUri`

[setOriginalUri](https://github.com/ninja/ninja-auth-js#setoriginaluriuri) is used to save the current/pending URL before beginning a redirect flow. There is a new option, [restoreOriginalUri](https://github.com/ninja/ninja-auth-js#restoreoriginaluri), which can be used to customize the last step of the login redirect flow.

#### `isAuthenticated` will be true if **both** accessToken **and** idToken are valid

If you have a custom `isAuthenticated` function which implements the default logic, you may remove it.

#### `getAccessToken` and `getIdToken` have been changed to synchronous methods

With maintaining in-memory [AuthState][] since [@ninja/ninja-auth-js][] version 4.1, token values can be accessed in synchronous manner.

#### `getTokenManager` has been removed

You may access the `TokenManager` with the `tokenManager` property:

```javascript
const tokens = $auth.tokenManager.getTokens();
```

#### `authRedirectGuard` has been removed

Guard logic is handled internally in `@ninja/ninja-vue@3.x`, previous global guard registration should be removed:

```diff
- router.beforeEach(Vue.prototype.$auth.authRedirectGuard())
```

### "Active" token renew

Previously, tokens would only be renewed when they were read from storge. This typically occurred when a user was navigating to a protected route. Now, tokens will be renewed in the background before they expire. If token renew fails, the [AuthState][] will be updated and `isAuthenticated` will be recalculated. If the user is currently on a protected route, they will need to re-authenticate. Set the `onAuthRequired` option to customize behavior when authentication is required. You can set [tokenManager.autoRenew](https://github.com/ninja/ninja-auth-js/blob/master/README.md#autorenew) to `false` to disable active token renew logic.

### `Auth.handleCallback` is replaced by `LoginCallback` component

`LoginCallback` component is exported from `@ninja/ninja-vue` since version 3.0.0. You should replace `Auth.handleCallback()` with `LoginCallback` component.

```diff
- import Auth from `@ninja/ninja-vue`
+ import { LoginCallback } from `@ninja/ninja-vue`

...

- { path: '/login/callback', component: Auth.handleCallback() }
+ { path: '/login/callback', component: LoginCallback }
```
