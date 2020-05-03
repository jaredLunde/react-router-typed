import * as React from 'react'
import {createMemoryHistory, parsePath} from 'history'
import type {
  MemoryHistory,
  History,
  PathPieces,
  Location,
  State,
  Blocker,
} from 'history'

export const createRouter = <T extends RouteTypes>(routes: Routes<T>) => {
  const toProp = <To extends Extract<keyof T, string>>(
    to: ToProp<To>,
    params?: RouteParams | null | undefined,
    state?: State | null | undefined
  ): ToObject => {
    if (typeof to === 'string') {
      // super naive url parsing for the case when a user wants to
      // provide state to `to` props
      const href = generatePath(routes[to], params)
      const [initialPathname, ...hash] = href.split('#')
      const [pathname, ...search] = initialPathname.split('?')

      return {
        pathname,
        search: search.length ? `?${search.join('?')}` : '',
        hash: hash.length ? `#${hash.join('#')}` : '',
        state: state || undefined,
      }
    }
    // Yes, the intent is for to.state to overwrite state if it exists
    return state ? Object.assign({state}, to) : to
  }

  ///////////////////////////////////////////////////////////////////////////////
  // CONTEXT
  ///////////////////////////////////////////////////////////////////////////////

  // @ts-ignore
  const LocationContext = React.createContext<LocationContextType>({})
  const RouteContext = React.createContext<RouteContextType<T>>({
    outlet: null,
    params: readOnly({}),
    pathname: '',
    route: null,
  })

  ///////////////////////////////////////////////////////////////////////////////
  // COMPONENTS
  ///////////////////////////////////////////////////////////////////////////////

  /**
   * A <Router> that stores all entries in memory.
   */
  const MemoryRouter: React.FC<MemoryRouterProps> = ({
    children,
    initialEntries,
    initialIndex,
    timeout,
  }) => {
    const historyRef = React.useRef<MemoryHistory | null>(null)

    if (historyRef.current == null) {
      historyRef.current = createMemoryHistory({initialEntries, initialIndex})
    }

    return (
      <Router
        children={children}
        history={historyRef.current}
        timeout={timeout}
      />
    )
  }

  /**
   * Navigate programmatically using a component.
   */
  const Navigate = <To extends Extract<keyof T, string> = any>({
    to,
    replace,
    params,
    state,
  }: NavigateProps<T, To>) => {
    const navigate = useNavigate()

    const locationContext = React.useContext<LocationContextType>(
      LocationContext
    )
    invariant(
      locationContext != null,
      // TODO: This error is probably because they somehow have
      // 2 versions of the router loaded. We can help them understand
      // how to avoid that.
      `<Navigate> may be used only in the context of a <Router> component.`
    )

    warning(
      // @ts-ignore
      !locationContext.history.static,
      `<Navigate> must not be used on the initial render in a <StaticRouter>. ` +
        `This is a no-op, but you should modify your code so the <Navigate> is ` +
        `only ever rendered in response to some user interaction or state change.`
    )

    React.useEffect(() => {
      navigate(to, {params, state, replace})
    })

    return null
  }

  /**
   * Renders the child route's element, if there is one.
   */
  const Outlet: React.FC<OutletProps> = () => useOutlet()

  /**
   * Used in a route config to render an element.
   */
  const Route = <To extends Extract<keyof T, string> = any>({
    element = <Outlet />,
  }: RouteProps<T, To>) => element

  /**
   * The root context provider. There should be only one of these in a given app.
   */

  const Router: React.FC<RouterProps> = ({
    children = null,
    history,
    timeout = 2000,
  }) => {
    const [location, setLocation] = React.useState(history.location)
    const [startTransition, pending] = useTransition({timeoutMs: timeout})
    const shouldListenRef = React.useRef(true)

    if (shouldListenRef.current) {
      shouldListenRef.current = false
      history.listen(({location}) => {
        startTransition(() => {
          setLocation(location)
        })
      })
    }

    return (
      <LocationContext.Provider
        children={children}
        value={{history, location, pending}}
      />
    )
  }

  /**
   * A wrapper for useRoutes that treats its children as route and/or redirect
   * objects.
   */
  const Routes: React.FC<RoutesProps> = ({
    basename = '',
    caseSensitive = false,
    children,
  }) => {
    const routes = createRoutesFromChildren(children)
    return useRoutes(routes, basename, caseSensitive)
  }

  if (__DEV__) {
    LocationContext.displayName = 'Location'
    RouteContext.displayName = 'Route'
    MemoryRouter.displayName = 'MemoryRouter'
    Navigate.displayName = 'Navigate'
    Outlet.displayName = 'Outlet'
    Route.displayName = 'Route'
    Router.displayName = 'Router'
    Routes.displayName = 'Routes'
  }

  ///////////////////////////////////////////////////////////////////////////////
  // HOOKS
  ///////////////////////////////////////////////////////////////////////////////

  /**
   * Blocks all navigation attempts. This is useful for preventing the page from
   * changing until some condition is met, like saving form data.
   */
  const useBlocker = (blocker: Blocker, when = true) => {
    const locationContext = React.useContext<LocationContextType>(
      LocationContext
    )
    invariant(
      locationContext !== null,
      // TODO: This error is probably because they somehow have
      // 2 versions of the router loaded. We can help them understand
      // how to avoid that.
      `useBlocker() may be used only in the context of a <Router> component.`
    )
    const {history} = locationContext

    React.useEffect(() => {
      if (when) {
        const unblock = history.block((tx) => {
          const autoUnblockingTx = Object.assign(tx, {
            retry() {
              // Automatically unblock the transition so it can
              // play all the way through before retrying it.
              // TODO: Figure out how to re-enable this block if the
              // transition is cancelled for some reason.
              unblock()
              tx.retry()
            },
          })

          blocker(autoUnblockingTx)
        })

        return unblock
      }
    }, [history, when, blocker])
  }

  /**
   * Returns the full href for the given "to" value. This is useful for building
   * custom links that are also accessible and preserve right-click behavior.
   */
  const useHref = <To extends Extract<keyof T, string>>(
    to: ToProp<To>,
    params?: T[To]['params']
  ) => {
    const resolvedLocation = toProp(to, params)
    const locationContext = React.useContext<LocationContextType>(
      LocationContext
    )

    invariant(
      locationContext != null,
      // TODO: This error is probably because they somehow have
      // 2 versions of the router loaded. We can help them understand
      // how to avoid that.
      `useHref() may be used only in the context of a <Router> component.`
    )

    return locationContext.history.createHref(resolvedLocation)
  }

  /**
   * Returns the current location object, which represents the current URL in web
   * browsers.
   *
   * NOTE: If you're using this it may mean you're doing some of your own "routing"
   * in your app, and we'd like to know what your use case is. We may be able to
   * provide something higher-level to better suit your needs.
   */
  const useLocation = () =>
    React.useContext<LocationContextType>(LocationContext).location

  /**
   * Returns true if the URL for the given "to" value matches the current URL.
   * This is useful for components that need to know "active" state, e.g.
   * <NavLink>.
   */
  const useMatch = <To extends Extract<keyof T, string>>(
    to: ToProp<To>,
    params?: T[To]['params']
  ) =>
    // TODO: Try to match search + hash as well
    useLocation().pathname === toProp(to, params).pathname

  /**
   * Returns an imperative method for changing the location. Used by <Link>s, but
   * may also be used by other elements to change the location.
   */
  const useNavigate = () => {
    const {pathname} = React.useContext(RouteContext)
    const locationContext = React.useContext<LocationContextType>(
      LocationContext
    )

    invariant(
      locationContext != null,
      // TODO: This error is probably because they somehow have
      // 2 versions of the router loaded. We can help them understand
      // how to avoid that.
      `useNavigate() may be used only in the context of a <Router> component.`
    )

    const {history, pending} = locationContext
    const activeRef = React.useRef(false)

    React.useEffect(() => {
      activeRef.current = true
    })

    const navigate = React.useCallback(
      <To extends Extract<keyof T, string>>(
        to: ToProp<To>,
        {
          params,
          state,
          replace,
        }: {
          params?: T[To]['params']
          state?: T[To]['state']
          replace?: boolean
        } = {}
      ) => {
        if (activeRef.current) {
          if (typeof to === 'number') {
            history.go(to)
          } else {
            const relativeTo = resolveLocation(
              toProp(to, params, state),
              pathname
            )
            // If we are pending transition, use REPLACE instead of PUSH.
            // This will prevent URLs that we started navigating to but
            // never fully loaded from appearing in the history stack.
            const method = !!replace || pending ? 'replace' : 'push'
            history[method](
              relativeTo,
              state === null ? undefined : (state as State)
            )
          }
        } else {
          warning(
            false,
            `You should call navigate() in a useEffect, not when ` +
              `your component is first rendered.`
          )
        }
      },
      [history, pathname, pending]
    )

    return navigate
  }

  /**
   * Returns the outlet element at this level of the route hierarchy. Used to
   * render child routes.
   */
  const useOutlet = () => React.useContext(RouteContext).outlet

  /**
   * Returns a hash of the dynamic params that were matched in the route path.
   * This is useful for using ids embedded in the URL to fetch data, but we
   * eventually want to provide something at a higher level for this.
   */
  const useParams = <
    To extends Extract<keyof T, string> = any
  >(): T[To]['params'] => React.useContext(RouteContext).params

  /**
   * Returns the element of the route that matched the current location, prepared
   * with the correct context to render the remainder of the route tree. Route
   * elements in the tree must render an <Outlet> to render their child route's
   * element.
   */
  const useRoutes = (
    routes: RouteType<T>[],
    basename = '',
    caseSensitive = false
  ) => {
    const {params: parentParams, pathname: parentPathname} = React.useContext(
      RouteContext
    )

    basename = basename ? joinPaths([parentPathname, basename]) : parentPathname

    const location = useLocation()
    const matches = React.useMemo(
      () => matchRoutes(routes, location, basename, caseSensitive),
      [routes, location, basename, caseSensitive]
    )

    if (!matches) {
      // TODO: Warn about nothing matching, suggest using a catch-all route.
      return null
    }

    // TODO: Initiate preload sequence here.
    // Otherwise render an element.
    const element = matches.reduceRight((outlet, {params, pathname, route}) => {
      return (
        <RouteContext.Provider
          children={'element' in route ? route.element : void 0}
          value={{
            outlet,
            params: readOnly(Object.assign({}, parentParams, params)),
            pathname: joinPaths([basename, pathname]),
            route,
          }}
        />
      )
    }, null)

    return element
  }

  ///////////////////////////////////////////////////////////////////////////////
  // UTILS
  ///////////////////////////////////////////////////////////////////////////////

  /**
   * Matches the given routes to a location and returns the match data.
   */
  const matchRoutes = (
    routesToMatch: RouteType<T>[],
    routeLocation: Location<any> | string,
    basename = '',
    caseSensitive = false
  ) => {
    let location: PathPieces | Location<any>

    if (typeof routeLocation === 'string') {
      location = parsePath(routeLocation)
    } else {
      location = routeLocation
    }

    const base = basename.replace(/^\/+|\/+$/g, '')
    let target: string = location.pathname?.slice(1) || ''

    if (base) {
      if (base === target) {
        target = ''
      } else if (target.startsWith(base)) {
        target = target.slice(base.length).replace(/^\/+/, '')
      } else {
        return null
      }
    }

    const flattenedRoutes = flattenRoutes(routesToMatch)
    rankFlattenedRoutes(flattenedRoutes)

    for (let i = 0; i < flattenedRoutes.length; ++i) {
      const [path, flatRoutes] = flattenedRoutes[i]

      // TODO: Match on search, state too
      const [matcher] = compilePath(path, /* end */ true, caseSensitive)

      if (matcher.test(target)) {
        return flatRoutes.map((route, index) => {
          const nextRoutes = flatRoutes.slice(0, index + 1)
          const path = joinPaths(
            nextRoutes.map((r) =>
              ('to' in r && r.to === '*') || ('path' in r && r.path === 'to')
                ? '*'
                : 'to' in r
                ? routes[r.to]
                : r.path
            )
          )
          const [matcher, keys] = compilePath(
            path,
            /* end */ false,
            caseSensitive
          )
          const match = target.match(matcher)

          const pathname = '/' + match?.[1] || ''
          const values = match?.slice(2) || []
          const params: Params = keys.reduce((memo, key, index) => {
            memo[key] = safelyDecodeURIComponent(values[index], key)
            return memo
          }, {})

          return {params, pathname, route}
        })
      }
    }

    return null
  }

  /**
   * Returns a fully resolve location object relative to the given pathname.
   */
  const resolveLocation = <To extends Extract<keyof T, string> = any>(
    to: ToProp<To>,
    fromPathname = '/'
  ) => {
    to = toProp(to)
    const {pathname: toPathname, search = '', hash = ''} =
      typeof to === 'string' ? parsePath(to) : to

    const pathname: string = toPathname
      ? toPathname.startsWith('/')
        ? resolvePathname(toPathname, '/')
        : resolvePathname(toPathname, fromPathname)
      : fromPathname

    return {pathname, search, hash}
  }

  /**
   * Creates a path with params interpolated.
   */
  const generatePath = <To extends Extract<keyof T, string> = any>(
    pathname: T[To]['path'],
    params: T[To]['params'] = {}
  ) =>
    params &&
    pathname
      .replace(/:(\w+)/g, (_, key) => String(params[key]) || `:${key}`)
      .replace(/\*$/, (splat) => String(params[splat] || splat))

  const flattenRoutes = (
    routesToFlatten: RouteType<T>[],
    // @ts-ignore
    flattenedRoutes: [string, RouteType[], number[]][] = [],
    parentPath = '',
    parentRoutes: RouteType<T>[] = [],
    parentIndexes: number[] = []
  ): [string, RouteType<T>[], number[]][] => {
    routesToFlatten.forEach((route, index) => {
      const path = joinPaths([
        parentPath,
        ('to' in route && route.to === '*') ||
        ('path' in route && route.path === 'to')
          ? '*'
          : 'to' in route
          ? routes[route.to]
          : route.path,
      ])
      const routesToFlatten = parentRoutes.concat(route)
      const indexes = parentIndexes.concat(index)

      flattenedRoutes.push([path, routesToFlatten, indexes])
    })

    return flattenedRoutes
  }

  /**
   * Utility function that creates a routes config object from a React
   * "children" object, which is usually either a React element or an
   * array of elements.
   */
  const createRoutesFromChildren = (children: React.ReactNode) => {
    const routes: RouteType<T>[] = []

    React.Children.forEach(children, (element: React.ReactNode) => {
      // Ignore non-elements. This allows people to more
      // easily inline conditionals in their route config.
      if (!React.isValidElement(element)) return

      // Transparently support React.Fragment and its children.
      if (element.type === React.Fragment) {
        // eslint-disable-next-line prefer-spread
        routes.push.apply(
          routes,
          createRoutesFromChildren(element.props.children)
        )
        return
      }

      routes.push(
        'to' in element.props
          ? {to: element.props.to, element}
          : {
              path: element.props.path,
              redirectTo: element.props.redirectTo,
              element,
            }
      )
    })

    return routes
  }

  return {
    LocationContext,
    RouteContext,
    MemoryRouter,
    Navigate,
    Outlet,
    Route,
    Router,
    Routes,

    useBlocker,
    useHref,
    useLocation,
    useMatch,
    useNavigate,
    useOutlet,
    useParams,
    useRoutes,

    matchRoutes,
    resolveLocation,
    generatePath,
  }
}

///////////////////////////////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////////////////////////////

declare const __DEV__: boolean

const readOnly = __DEV__
  ? (obj: Record<any, any>) => Object.freeze(obj)
  : (obj: Record<any, any>) => obj

const invariant = (cond: any, message: string) => {
  if (!cond) throw new Error(message)
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

const safelyDecodeURIComponent = (value: string, paramName: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch (error) {
    warning(
      false,
      `The value for the URL param "${paramName}" will not be decoded because` +
        ` the string "${value}" is a malformed URL segment. This is probably` +
        ` due to a bad percent encoding (the error message was: ${error.message}).`
    )

    return value
  }
}

const paramRe = /^:\w+$/
const dynamicSegmentValue = 2
const emptySegmentValue = 1
const staticSegmentValue = 10
const splatPenalty = -2
const isSplat = (s: string) => s === '*'

const computeScore = (path: string) => {
  const segments = path.split('/')
  let initialScore = segments.length
  if (segments.some(isSplat)) {
    initialScore += splatPenalty
  }

  return segments
    .filter((s: string) => !isSplat(s))
    .reduce(
      (score: number, segment: string) =>
        score +
        (paramRe.test(segment)
          ? dynamicSegmentValue
          : segment === ''
          ? emptySegmentValue
          : staticSegmentValue),
      initialScore
    )
}

const rankFlattenedRoutes = (flattenedRoutes) => {
  const pathScores = flattenedRoutes.reduce((memo, [path]) => {
    memo[path] = computeScore(path)
    return memo
  }, {})

  flattenedRoutes.sort((a, b) => {
    const [aPath, , aIndexes] = a
    const aScore = pathScores[aPath]

    const [bPath, , bIndexes] = b
    const bScore = pathScores[bPath]

    return aScore !== bScore
      ? bScore - aScore // Higher score first
      : compareIndexes(aIndexes, bIndexes)
  })
}

const compareIndexes = (a: number[], b: number[]) => {
  const siblings =
    a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i])
  return siblings
    ? a[a.length - 1] - b[b.length - 1] // Earlier siblings come first
    : 0 // It doesn't make sense to rank non-siblings by index, so they sort equal
}

const compilePath = (
  path: string,
  end: boolean,
  caseSensitive: boolean
): [RegExp, string[]] => {
  const keys: string[] = []
  let pattern =
    '^(' +
    path
      .replace(/^\/+/, '') // Ignore leading /
      .replace(/\*\//g, '') // Ignore */ (from paths nested under a *)
      .replace(/\/?\*?$/, '') // Ignore trailing /*, we'll handle it below
      .replace(/[\\.*+^$?{}|()[\]]/g, '\\$&') // Escape special regex chars
      .replace(/:(\w+)/g, (_, key) => {
        keys.push(key)
        return '([^\\/]+)'
      }) +
    ')'

  if (path.endsWith('*')) {
    if (path.endsWith('/*')) {
      pattern += '\\/?' // Don't include the / in params['*']
    }
    keys.push('*')
    pattern += '(.*)'
  } else if (end) {
    pattern += '\\/?'
  }

  if (end) pattern += '$'

  const flags = caseSensitive ? undefined : 'i'
  const matcher = new RegExp(pattern, flags)

  return [matcher, keys]
}

const trimTrailingSlashes = (path: string) => path.replace(/\/+$/, '')
const normalizeSlashes = (path: string) => path.replace(/\/\/+/g, '/')
const joinPaths = (paths: string[]) => normalizeSlashes(paths.join('/'))
const splitPath = (path: string) => normalizeSlashes(path).split('/')

const resolvePathname = (toPathname, fromPathname) => {
  const segments = splitPath(trimTrailingSlashes(fromPathname))
  const relativeSegments = splitPath(toPathname)

  relativeSegments.forEach((segment) => {
    if (segment === '..') {
      // Keep the root "" segment so the pathname starts at /
      if (segments.length > 1) segments.pop()
    } else if (segment !== '.') {
      segments.push(segment)
    }
  })

  return segments.length > 1 ? joinPaths(segments) : '/'
}

// TODO: Remove once React.useTransition is stable.
const startTransition = (tx: () => any) => tx()
//@ts-ignore
const useTransition = React.useTransition || (() => [startTransition, false])

///////////////////////////////////////////////////////////////////////////////
// Types
///////////////////////////////////////////////////////////////////////////////

export type ToProp<To extends string = any> = To | ToObject

export type ToObject = {
  pathname: string
  search?: string
  hash?: string
  state?: Record<string, any>
}

export type RouteParams = {
  [paramName: string]: string | number | boolean | undefined
}

export type LocationState = {
  [key: string]: string | boolean | number | null | LocationState
}

export interface RouteTypes {
  [to: string]: {
    path: string
    params: RouteParams | null
    state: LocationState | null
  }
}

export type RouteType<T> =
  | {
      readonly to: keyof T | '*'
      readonly element: React.ReactElement | JSX.Element
    }
  | {
      readonly path: string
      readonly redirectTo: keyof T
      readonly element: React.ReactElement | JSX.Element
    }

export type Params<P extends Record<string, string> = {}> = {
  [K in keyof P]?: string
}

export type Routes<T extends RouteTypes> = {
  readonly [To in keyof T]: T[To]['path']
}

export interface LocationContextType<S extends State = State> {
  readonly history: History<S>
  readonly location: Location<S>
  readonly pending: boolean
}

export interface RouteContextType<T, P = Params> {
  readonly outlet: React.ReactElement | JSX.Element | null
  readonly params: P
  readonly pathname: string
  readonly route: RouteType<T> | null
}

export interface RouterProps {
  history: History
  timeout?: number
}

export interface RoutesProps {
  basename?: string
  caseSensitive?: boolean
}

export interface MemoryRouterProps {
  readonly initialEntries?: Location[]
  readonly initialIndex?: number
  readonly keyLength?: number
  readonly timeout?: number
}

export interface NavigateProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> {
  readonly to: To
  readonly params?: T[To]['params']
  readonly state?: T[To]['state']
  readonly replace?: boolean
}

export interface RouteProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> {
  readonly to?: To | '*'
  readonly state?: T[To]['state']
  readonly element?: React.ReactElement | JSX.Element
  readonly children?: React.ReactElement | JSX.Element
  readonly innerRef?: React.Ref<
    JSX.Element | React.ReactElement<RouteProps<T, To>>
  >
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OutletProps {}
