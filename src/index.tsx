import React, {forwardRef} from 'react'
import {
  BrowserRouter,
  Router,
  StaticRouter,
  generatePath,
  HashRouter,
  Link as Link__,
  MemoryRouter,
  matchPath as matchPath_,
  NavLink as NavLink__,
  Prompt,
  Redirect as Redirect_,
  Route as Route_,
  useHistory as useHistory_,
  useLocation as useLocation_,
  useParams as useParams_,
  useRouteMatch as useRouteMatch_,
  withRouter,
  // Types
  RouteComponentProps,
  RouteChildrenProps,
  RouteProps as RouteProps_,
  RedirectProps as RedirectProps_,
  match,
} from 'react-router-dom'
import {
  __RouterContext,
  SwitchProps,
  StaticContext,
  StaticRouterProps as StaticRouterProps_,
} from 'react-router'
import {
  createAsyncRoute as createAsyncRoute_,
  AsyncRouteOptions,
  LinkProps as LinkProps_,
  NavLinkProps as NavLinkProps_,
  withPreload,
} from 'create-async-route'
import {AsyncComponentGetter} from 'create-async-component'
import {History, Location} from 'history'

const Link_ = withPreload(Link__)
const NavLink_ = withPreload(NavLink__)

export type RouteParams = {
  [paramName: string]: string | number | boolean | undefined
}

export type LocationState = {
  [key: string]: string | boolean | number | null | LocationState
}

export interface RouteTypes {
  [to: string]: {
    path: string
    params?: RouteParams | null
    state?: LocationState | null
  }
}

export type ToParams<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> = {
  to: To
  params?: T[To]['params']
  state?: T[To]['state']
}

export type LinkProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> = LinkProps_ &
  ToParams<T, To> & {
    ref?: never
    innerRef?: React.Ref<HTMLAnchorElement>
  }

export type NavLinkProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> = NavLinkProps_ &
  ToParams<T, To> & {
    ref?: never
    innerRef?: React.Ref<HTMLAnchorElement>
  }

export type RedirectProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> = Omit<RedirectProps_, 'to'> &
  ToParams<T, To> & {
    innerRef?: React.Ref<React.ReactElement<RedirectProps_>>
  }

export type OutParams<
  T extends RouteTypes,
  To extends Extract<keyof T, string>
> = {
  [K in keyof Extract<T[To]['params'], Record<string, string>>]?: string
}

export type Routes<T extends RouteTypes = RouteTypes> = {
  [To in keyof T]: T[To]['path']
}

export interface StaticRouterProps<Context> extends StaticRouterProps_ {
  context?: Context & StaticContext
  children?: React.ReactNode
}

export interface RouteProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>,
  Context
> extends RouteProps_ {
  to?: To | To[] | '*'
  path?: To | To[] | '*'
  component?:
    | React.ComponentType<
        RouteComponentProps<
          OutParams<T, To>,
          Context & StaticContext,
          T[To]['state']
        >
      >
    | React.ComponentType<any>
  ref?: never
  innerRef?: React.Ref<React.ReactElement<RouteProps_>>
  render?: (
    props: RouteComponentProps<
      OutParams<T, To>,
      Context & StaticContext,
      T[To]['state']
    >
  ) => React.ReactNode
  children?:
    | ((
        props: RouteChildrenProps<OutParams<T, To>, T[To]['state']>
      ) => React.ReactNode)
    | React.ReactNode
}

const createTypedRouter = <
  T extends RouteTypes = RouteTypes,
  Context = StaticContext
>(
  routes: Routes<T>
) => {
  const normalizeTo = <To extends Extract<keyof T, string>>(
    to: To,
    params: T[To]['params'],
    state: T[To]['state']
  ) => {
    // super naive url parsing for the case when a user wants to
    // provide state to `to` props
    const href = generatePath(routes[to], params as RouteParams)
    const [initialPathname, ...hash] = href.split('#')
    const [pathname, ...search] = initialPathname.split('?')
    return {
      pathname,
      search: `?${search.join('?')}`,
      hash: `#${hash.join('#')}`,
      state,
    }
  }

  const toProps = <To extends Extract<keyof T, string>, Props>({
    to,
    params,
    state,
    innerRef,
    ...props
  }: RedirectProps<T, To> | LinkProps<T, To> | NavLinkProps<T, To>) => ({
    ...props,
    ref: innerRef,
    to:
      params === null
        ? routes[to]
        : state
        ? normalizeTo(to, params, state)
        : generatePath(routes[to], params as RouteParams),
  })

  const pathProps = (props: Record<string, any>, ref: any = void 0) => {
    const path = props.path || props.to
    return {
      ref,
      ...props,
      path:
        path === void 0
          ? path
          : Array.isArray(path)
          ? path.map(k => routes[k])
          : routes[path],
    }
  }

  const Route = <To extends Extract<keyof T, string> = any>({
    innerRef,
    ...props
  }: RouteProps<T, To, Context>) =>
    React.createElement(Route_, pathProps(props, innerRef))

  const Switch: React.FC<SwitchProps> = forwardRef(
    ({location, children}, ref) => {
      const contextLocation = useLocation_()
      const realLocation = location || contextLocation
      const contextMatch = useRouteMatch_<any>()
      let element: React.ReactElement | null = null
      let computedMatch: match<any> | null = null

      React.Children.forEach(children, child => {
        if (computedMatch == null && React.isValidElement(child)) {
          element = child
          const path =
            routes[child.props.path || child.props.from || child.props.to]

          computedMatch = path
            ? matchPath_(realLocation.pathname, {...child.props, path})
            : contextMatch
        }
      })

      return computedMatch && element
        ? React.cloneElement(element, {
            location: realLocation,
            computedMatch: computedMatch,
            ref,
          })
        : null
    }
  )

  function createAsyncRoute<P = RouteProps<T, any, Context>>(
    component: AsyncComponentGetter<any>,
    options?: AsyncRouteOptions<any>
  ) {
    return createAsyncRoute_<P>(component, {...options, route: Route})
  }

  return {
    Router,
    BrowserRouter,
    HashRouter,
    MemoryRouter,
    StaticRouter: forwardRef((props: StaticRouterProps<Context>, ref) =>
      React.createElement(StaticRouter, Object.assign({ref}, props))
    ),
    Prompt,
    Switch,
    Route,
    Link: <To extends Extract<keyof T, string>>(props: LinkProps<T, To>) =>
      React.createElement(Link_, toProps(props)),
    NavLink: <To extends Extract<keyof T, string>>(
      props: NavLinkProps<T, To>
    ) => React.createElement(NavLink_, toProps(props)),
    Redirect: <To extends Extract<keyof T, string>>(
      props: RedirectProps<T, To>
    ): React.ReactElement<RedirectProps_> =>
      React.createElement(Redirect_, toProps(props)),
    useHistory: <To extends Extract<keyof T, string> = any>(): History<
      T[To]['state']
    > => useHistory_(),
    useLocation: <To extends Extract<keyof T, string> = any>(): Location<
      T[To]['state']
    > => useLocation_(),
    useParams: <To extends Extract<keyof T, string> = any>(): OutParams<
      T,
      To
    > => useParams_(),
    useRouteMatch: <To extends Extract<keyof T, string>>(
      to?: To | To[] | RouteProps<T, To, Context>
    ): match<OutParams<T, To>> | null =>
      to
        ? useRouteMatch_(
            Array.isArray(to)
              ? to.map(k => routes[k])
              : typeof to === 'object'
              ? pathProps(to)
              : routes[to]
          )
        : useRouteMatch_(),
    matchPath: <To extends Extract<keyof T, string>>(
      pathname: string,
      props: RouteProps<T, To, Context>,
      parent?: match<OutParams<T, To>> | null
    ) => matchPath_(pathname, pathProps(props), parent),
    generatePath,
    withRouter,
    __RouterContext,
    createAsyncRoute,
  }
}

export default createTypedRouter
