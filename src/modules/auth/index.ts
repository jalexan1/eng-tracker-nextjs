/**
 * @file src/modules/auth/index.ts
 * @description Barrel export del módulo de autenticación.
 * Solo exporta lo que otros módulos necesitan conocer.
 */
export { loginAction, signupAction, loginWithGoogleAction, logoutAction } from './actions/auth.actions'
export { LoginForm } from './components/LoginForm'
export type { AuthState } from './types'
