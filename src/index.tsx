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

let routes: Routes = {}

export const configureRoutes = (nextRoutes: Routes) => {
  routes = nextRoutes
}

const readOnly = __DEV__
  ? (obj: Record<any, any>) => Object.freeze(obj)
  : (obj: Record<any, any>) => obj

export const toProp = <To extends RouteTo>(
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
export const LocationContext = React.createContext<LocationContextType>({
  // @ts-ignore
  history: null,
  // @ts-ignore
  location: null,
  pending: false,
})

export const RouteContext = React.createContext<RouteContextType>({
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
export const MemoryRouter: React.FC<MemoryRouterProps> = ({
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
export const Navigate = <To extends RouteTo = RouteTo>({
  to,
  replace,
  params,
  state,
}: NavigateProps<RouteTypes, To>) => {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have
    // 2 versions of the router loaded. We can help them understand
    // how to avoid that.
    `<Navigate> may be used only in the context of a <Router> component.`
  )

  const {history} = React.useContext(LocationContext)

  warning(
    !history.static,
    `<Navigate> must not be used on the initial render in a <StaticRouter>. ` +
      `This is a no-op, but you should modify your code so the <Navigate> is ` +
      `only ever rendered in response to some user interaction or state change.`
  )

  const navigate = useNavigate()

  React.useEffect(() => {
    navigate(to, {params, state, replace})
  })

  return null
}

/**
 * Renders the child route's element, if there is one.
 */
export const Outlet: React.FC<OutletProps> = () => useOutlet()

/**
 * Used in a route config to render an element.
 */
export const Route = <To extends RouteTo = RouteTo>({
  element = <Outlet />,
}: RouteProps<RouteTypes, To>) => element

/**
 * The root context provider. There should be only one of these in a given app.
 */

export const Router: React.FC<RouterProps> = ({
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
export const Routes: React.FC<RoutesProps> = ({
  basename = '',
  caseSensitive = false,
  children,
}) => {
  const routes = configureRoutesFromChildren(children)
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
export const useBlocker = (blocker: Blocker, when = true) => {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have
    // 2 versions of the router loaded. We can help them understand
    // how to avoid that.
    `useBlocker() may be used only in the context of a <Router> component.`
  )
  const {history} = React.useContext<LocationContextType>(LocationContext)

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
export const useHref = <To extends RouteTo>(
  to: ToProp<To>,
  params?: RouteTypes[To]['params']
) => {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have
    // 2 versions of the router loaded. We can help them understand
    // how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  )

  const {history} = React.useContext<LocationContextType>(LocationContext)
  return history.createHref(toProp(to, params))
}

export const useInRouterContext = () => useLocation() != null

/**
 * Returns the current location object, which represents the current URL in web
 * browsers.
 *
 * NOTE: If you're using this it may mean you're doing some of your own "routing"
 * in your app, and we'd like to know what your use case is. We may be able to
 * provide something higher-level to better suit your needs.
 */
export const useLocation = () =>
  React.useContext<LocationContextType>(LocationContext).location

/**
 * Returns true if the URL for the given "to" value matches the current URL.
 * This is useful for components that need to know "active" state, e.g.
 * <NavLink>.
 */
export const useMatch = <To extends RouteTo>(
  to: ToProp<To>,
  params?: RouteTypes[To]['params']
) =>
  // TODO: Try to match search + hash as well
  useLocation().pathname === toProp(to, params).pathname

/**
 * Returns an imperative method for changing the location. Used by <Link>s, but
 * may also be used by other elements to change the location.
 */
export const useNavigate = () => {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have
    // 2 versions of the router loaded. We can help them understand
    // how to avoid that.
    `useNavigate() may be used only in the context of a <Router> component.`
  )

  const {pathname} = React.useContext(RouteContext)
  const {history, pending} = React.useContext<LocationContextType>(
    LocationContext
  )
  const activeRef = React.useRef(false)

  React.useEffect(() => {
    activeRef.current = true
  })

  const navigate = React.useCallback(
    <To extends RouteTo>(
      to: ToProp<To>,
      {
        params,
        state,
        replace,
      }: {
        params?: RouteTypes[To]['params']
        state?: RouteTypes[To]['state']
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
export const useOutlet = () => React.useContext(RouteContext).outlet

/**
 * Returns a hash of the dynamic params that were matched in the route path.
 * This is useful for using ids embedded in the URL to fetch data, but we
 * eventually want to provide something at a higher level for this.
 */
export const useParams = <
  To extends RouteTo = RouteTo
>(): RouteTypes[To]['params'] => React.useContext(RouteContext).params

/**
 * Returns the element of the route that matched the current location, prepared
 * with the correct context to render the remainder of the route tree. Route
 * elements in the tree must render an <Outlet> to render their child route's
 * element.
 */
export const useRoutes = (
  routes: RouteType[],
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

/**
 * Returns true if the router is pending a location update.
 */
export const useLocationPending = () =>
  React.useContext<LocationContextType>(LocationContext).pending

///////////////////////////////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////////////////////////////

/**
 * Matches the given routes to a location and returns the match data.
 */
export const matchRoutes = (
  routesToMatch: RouteType[],
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
export const resolveLocation = <To extends RouteTo = RouteTo>(
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
export const generatePath = <To extends RouteTo = RouteTo>(
  pathname: RouteTypes[To]['path'],
  params: RouteTypes[To]['params'] = {}
) =>
  !params
    ? pathname
    : pathname
        .replace(/:(\w+)/g, (_, key) => String(params[key]) || `:${key}`)
        .replace(/\*$/, (splat) => String(params[splat] || splat))

const flattenRoutes = (
  routesToFlatten: RouteType[],
  // @ts-ignore
  flattenedRoutes: [string, RouteType[]][] = [],
  parentPath = ''
): [string, RouteType[]][] => {
  routesToFlatten.forEach((route) => {
    const path = joinPaths([
      parentPath,
      ('to' in route && route.to === '*') ||
      ('path' in route && route.path === 'to')
        ? '*'
        : 'to' in route
        ? routes[route.to]
        : route.path,
    ])

    flattenedRoutes.push([path, routesToFlatten])
  })

  return flattenedRoutes
}

/**
 * Utility function that creates a routes config object from a React
 * "children" object, which is usually either a React element or an
 * array of elements.
 */
const configureRoutesFromChildren = (children: React.ReactNode) => {
  const routes: RouteType[] = []

  React.Children.forEach(children, (element: React.ReactNode) => {
    // Ignore non-elements. This allows people to more
    // easily inline conditionals in their route config.
    if (!React.isValidElement(element)) return

    // Transparently support React.Fragment and its children.
    if (element.type === React.Fragment) {
      // eslint-disable-next-line prefer-spread
      routes.push.apply(
        routes,
        configureRoutesFromChildren(element.props.children)
      )
      return
    }

    routes.push(
      // @ts-ignore
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

///////////////////////////////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////////////////////////////

declare const __DEV__: boolean

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

  // Sorting is stable in modern browsers, but we still support IE 11, so we
  // need this little helper.
  stableSort(flattenedRoutes, (a, b) => {
    const [aPath, , aIndexes] = a
    const aScore = pathScores[aPath]

    const [bPath, , bIndexes] = b
    const bScore = pathScores[bPath]

    return aScore !== bScore
      ? bScore - aScore // Higher score first
      : compareIndexes(aIndexes, bIndexes)
  })
}

function stableSort(array, compareItems) {
  // This copy lets us get the original index of an item so we can preserve the
  // original ordering in the case that they sort equally.
  const copy = array.slice(0)
  array.sort((a, b) => compareItems(a, b) || copy.indexOf(a) - copy.indexOf(b))
}

const compareIndexes = (a: number[], b: number[]) => {
  const siblings =
    a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i])
  return siblings
    ? // If two routes are siblings, we should try to match the earlier sibling
      // first. This allows people to have fine-grained control over the matching
      // behavior by simply putting routes with identical paths in the order they
      // want them tried.
      a[a.length - 1] - b[b.length - 1]
    : // Otherwise, it doesn't really make sense to rank non-siblings by index,
      // so they sort equally.
      0
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

export type ToProp<To extends RouteTo = RouteTo> = To | ToObject

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

type KnownRoutes<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends {[_ in keyof T]: infer U}
  ? U
  : never

export type KnownRoutesOnly<T extends Record<any, any> = RouteTypes> = Pick<
  T,
  KnownRoutes<T>
>

export interface RouteTypes {
  [to: string]: {
    path: string
    params: RouteParams | null
    state: LocationState | null
  }
}

export type RouteTo<T extends RouteTypes = RouteTypes> = Extract<
  keyof KnownRoutesOnly<T>,
  string
>

export type RouteType<T extends RouteTypes = RouteTypes> =
  | {
      readonly to: RouteTo<T> | '*'
      readonly element: React.ReactElement
    }
  | {
      readonly path: string
      readonly redirectTo: RouteTo<T>
      readonly element: React.ReactElement
    }

export type Params<P extends Record<string, string> = {}> = {
  [K in keyof P]?: string
}

export type Routes<T extends RouteTypes = RouteTypes> = {
  readonly [To in RouteTo<T>]: T[To]['path']
}

export interface LocationContextType<S extends State = State> {
  readonly history: History<S>
  readonly location: Location<S>
  readonly pending: boolean
}

export interface RouteContextType<
  T extends RouteTypes = RouteTypes,
  P = Params
> {
  readonly outlet: React.ReactElement<{}> | null
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

export interface NavigateProps<T extends RouteTypes, To extends RouteTo<T>> {
  readonly to: To
  readonly params?: T[To]['params']
  readonly state?: T[To]['state']
  readonly replace?: boolean
}

export interface RouteProps<T extends RouteTypes, To extends RouteTo<T>> {
  readonly to?: To | '*'
  readonly state?: T[To]['state']
  readonly element?: React.ReactElement
  readonly children?: React.ReactElement
  readonly innerRef?: React.Ref<React.ReactElement<RouteProps<T, To>>>
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OutletProps {}
