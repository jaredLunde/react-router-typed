import * as React from 'react'
import {createBrowserHistory, parsePath, createPath} from 'history'
import {createRouter as createRouter_} from 'react-router-typed'
import type {History, State} from 'history'
import type {RouteTypes, Routes, ToProp} from 'react-router-typed'

export const createRouter = <T extends RouteTypes>(routes: Routes<T>) => {
  const base = createRouter_<T>(routes)

  ////////////////////////////////////////////////////////////////////////////////
  // COMPONENTS
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * A <Router> for use in web browsers. Provides the cleanest URLs.
   */
  const BrowserRouter: React.FC<BrowserRouterProps> = ({
    children,
    timeout,
    window,
  }) => {
    const historyRef = React.useRef<History | null>(null)

    if (historyRef.current === null) {
      historyRef.current = createBrowserHistory({window})
    }

    return (
      <base.Router
        children={children}
        history={historyRef.current}
        timeout={timeout}
      />
    )
  }

  /**
   * A <Router> that may not transition to any other location. This is useful
   * on the server where there is no stateful UI.
   */
  const StaticRouter: React.FC<StaticRouterProps> = ({
    children,
    location: initialLocation = '/',
  }) => {
    const loc: LocationWithOptionalProps =
      typeof initialLocation === 'string'
        ? parsePath(initialLocation)
        : initialLocation
    const action = 'POP'
    const location = {
      pathname: loc.pathname || '/',
      search: loc.search || '',
      hash: loc.hash || '',
      state: loc.state || null,
      key: loc.key || 'default',
    }
    const mockHistory = {
      // This is a clue that lets us warn about using a <Navigate>
      // on the initial render inside a <StaticRouter>
      static: true,
      get action() {
        return action
      },
      get location() {
        return location
      },
      createHref(to: string | Location) {
        return typeof to === 'string' ? to : createPath(to)
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      push(to: string, state: State) {
        throw new Error(
          `You cannot perform a PUSH on the server because it is a stateless ` +
            `environment. This error was probably triggered when you did a ` +
            `\`navigate(${JSON.stringify(to)})\` somewhere in your app.`
        )
      },
      replace(to: string) {
        throw new Error(
          `You cannot perform a REPLACE on the server because it is a stateless ` +
            `environment. This error was probably triggered when you did a ` +
            `\`navigate(${JSON.stringify(
              to
            )}, { replace: true })\` somewhere ` +
            `in your app.`
        )
      },
      go(n: number) {
        throw new Error(
          `You cannot perform ${n === -1 ? 'GO BACK' : `a GO(${n})`} on the ` +
            `server because it is a stateless environment. This error was probably ` +
            `triggered when you did a \`navigate(${n})\` somewhere in your app.`
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listen() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      block() {},
    }

    return <base.Router children={children} history={mockHistory} />
  }

  /**
   * The public API for rendering a history-aware <a>.
   */
  const Link = <To extends keyof T>({
    to,
    params,
    as: Component = 'a',
    innerRef,
    onClick,
    replace: replaceProp = false,
    state,
    target,
    ...rest
  }: LinkProps<T, To>) => {
    const href = base.useHref(to, params)
    const navigate = base.useNavigate()
    const location = base.useLocation()
    const toLocation = base.resolveLocation(to)
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) onClick(event)
      if (
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // Ignore everything but left clicks
        (!target || target === '_self') && // Let browser handle "target=_blank" etc.
        !isModifiedEvent(event) // Ignore clicks with modifier keys
      ) {
        event.preventDefault()

        const isSameLocation =
          toLocation.pathname === location.pathname &&
          toLocation.search === location.search &&
          toLocation.hash === location.hash

        // If the pathname, search, and hash haven't changed, a
        // regular <a> will do a REPLACE instead of a PUSH.
        const replace = !!replaceProp || isSameLocation

        navigate(to, {params, state, replace})
      }
    }

    return (
      <Component
        {...rest}
        href={href}
        onClick={handleClick}
        ref={innerRef}
        target={target}
      />
    )
  }

  /**
   * A <Link> wrapper that knows if it's "active" or not.
   */
  const NavLink = <To extends keyof T>({
    to,
    params,
    'aria-current': ariaCurrentProp = 'page',
    activeClassName = 'active',
    activeStyle,
    className: classNameProp = '',
    style: styleProp,
    ...rest
  }: NavLinkProps<T, To>) => {
    const match = base.useMatch(to, params)
    const ariaCurrent = match ? ariaCurrentProp : undefined
    const className = [classNameProp, match ? activeClassName : null]
      .filter(Boolean)
      .join(' ')
    const style = {
      ...styleProp,
      ...(match ? activeStyle : undefined),
    }

    return (
      <Link
        {...rest}
        aria-current={ariaCurrent}
        className={className}
        style={style}
        to={to}
      />
    )
  }

  /**
   * A declarative interface for showing a window.confirm dialog with the given
   * message when the user tries to navigate away from the current page.
   *
   * This also serves as a reference implementation for anyone who wants to
   * create their own custom prompt component.
   */
  const Prompt: React.FC<PromptProps> = ({message, when}) => {
    usePrompt(message, when)
    return null
  }

  ////////////////////////////////////////////////////////////////////////////////
  // HOOKS
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Prevents navigation away from the current page using a window.confirm prompt
   * with the given message.
   */
  const usePrompt = (message: string, when?: boolean) => {
    base.useBlocker(
      React.useCallback(
        (tx) => {
          if (window.confirm(message)) tx.retry()
        },
        [message]
      ),
      when
    )
  }

  /**
   * A convenient wrapper for accessing individual query parameters via the
   * URLSearchParams interface.
   */
  const useSearchParams = () => {
    warning(
      typeof URLSearchParams !== 'undefined',
      'You cannot use the `useSearchParams` hook in a browser that does not' +
        ' support the URLSearchParams API. If you need to support Internet Explorer 11,' +
        ' we recommend you load a polyfill such as https://github.com/ungap/url-search-params' +
        '\n\n' +
        "If you're unsure how to load polyfills, we recommend you check out https://polyfill.io/v3/" +
        ' which provides some recommendations about how to load polyfills only for users that' +
        ' need them, instead of for every user.'
    )

    const location = base.useLocation()
    const searchParams = React.useMemo(
      () => new URLSearchParams(location.search),
      [location.search]
    )

    return searchParams
  }

  if (__DEV__) {
    BrowserRouter.displayName = 'BrowserRouter'
    StaticRouter.displayName = 'StaticRouter'
    Link.displayName = 'Link'
    NavLink.displayName = 'NavLink'
    Prompt.displayName = 'Prompt'
  }

  return Object.assign(base, {
    BrowserRouter,
    StaticRouter,
    Link,
    NavLink,
    Prompt,
    usePrompt,
    useSearchParams,
  })
}

///////////////////////////////////////////////////////////////////////////////
// Utils
///////////////////////////////////////////////////////////////////////////////

const isModifiedEvent = (event: React.MouseEvent<HTMLAnchorElement>) => {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
}

const warning = (cond: any, message: string) => {
  if (!cond) {
    if (typeof console !== 'undefined') console.warn(message)

    try {
      throw new Error(message)
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

///////////////////////////////////////////////////////////////////////////////
// Types
///////////////////////////////////////////////////////////////////////////////

declare const __DEV__: boolean

export interface BrowserRouterProps {
  timeout?: number
  window?: typeof window
}

export interface StaticRouterProps {
  location?: string | LocationWithOptionalProps
}

export type LocationWithOptionalProps<S extends State = State> = {
  pathname?: string
  search?: string
  hash?: string
  state?: S
  key?: string
}

export interface LinkProps<T extends RouteTypes, To extends keyof T>
  extends React.HTMLAttributes<HTMLAnchorElement> {
  as?: React.ElementType | keyof JSX.IntrinsicElements
  innerRef: InnerRef<HTMLAnchorElement>
  ref: never
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => any
  replace?: boolean
  to: ToProp[To]
  params?: T[To]['params']
  state?: T[To]['state']
  target?: string
}

export interface NavLinkProps<T extends RouteTypes, To extends keyof T>
  extends LinkProps<T, To> {
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true'
  activeClassName?: string
  className?: string
  activeStyle?: React.CSSProperties
  style?: React.CSSProperties
}

export interface PromptProps {
  message: string
  when?: boolean
}

export type InnerRef<T = any> =
  | ((instance: T | null) => void)
  | React.MutableRefObject<T | null>
  | null

export type {
  ToProp,
  ToObject,
  RouteParams,
  LocationState,
  RouteTypes,
  RouteType,
  Params,
  Routes,
  LocationContextType,
  RouteContextType,
  MemoryRouterProps,
  NavigateProps,
  RouteProps,
  RouterProps,
  RoutesProps,
  OutletProps,
} from 'react-router-typed'
