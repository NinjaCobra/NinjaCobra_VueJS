import { ninjaAuth, AuthState } from '@ninja/ninja-auth-js';

export type OnAuthRequiredFunction = (ninjaAuth: ninjaAuth) => Promise<void> | void;

export interface ninjaVueOptions {
  ninjaAuth: ninjaAuth;
  onAuthRequired?: OnAuthRequiredFunction;
  onAuthResume?: OnAuthRequiredFunction;
}

export type ninjaAuthVue = ninjaAuth & {
  isInteractionRequiredError?: (error: Error) => boolean;
  options: {
    onAuthRequired?: OnAuthRequiredFunction;
    onAuthResume?: OnAuthRequiredFunction;
  };
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: ninjaAuthVue;
    authState: AuthState;
  }
}

declare global {
  const __VUE_OPTIONS_API__: boolean;
}
