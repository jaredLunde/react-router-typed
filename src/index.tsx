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
  useHistory,
  useLocation,
  useParams as useParams_,
  useRouteMatch as useRouteMatch_,
  withRouter,
  // Types
  RouteProps as RouteProps_,
  RedirectProps as RedirectProps_,
  match,
} from 'react-router-dom'
import {__RouterContext, SwitchProps} from 'react-router'
import {
  createAsyncRoute as createAsyncRoute_,
  AsyncRouteOptions,
  LinkProps as LinkProps_,
  NavLinkProps as NavLinkProps_,
  withPreload,
} from 'create-async-route'
import {AsyncComponentGetter} from 'create-async-component'
const Link_ = withPreload(Link__)
const NavLink_ = withPreload(NavLink__)

export type RouteParams = {
  [paramName: string]: string | number | boolean | undefined
}

export interface RouteMap {
  [routeKey: string]: {
    path: string
    params?: RouteParams | null
  }
}

export interface RouteProps<RM extends RouteMap> extends RouteProps_ {
  to?: Extract<keyof RM, string> | Extract<keyof RM, string>[]
  path?: Extract<keyof RM, string> | Extract<keyof RM, string>[]
}

export type ToParams<
  RM extends RouteMap,
  To extends Extract<keyof RM, string>
> = RM[To]['params'] extends null
  ? {
      to: To
      params?: never
    }
  : {
      to: To
      params: RM[To]['params']
    }

export type LinkProps<
  RM extends RouteMap,
  To extends Extract<keyof RM, string>
> = LinkProps_ &
  ToParams<RM, To> & {
    ref?: never
    innerRef?: React.Ref<HTMLAnchorElement>
  }

export type NavLinkProps<
  RM extends RouteMap,
  To extends Extract<keyof RM, string>
> = NavLinkProps_ &
  ToParams<RM, To> & {
    ref?: never
    innerRef?: React.Ref<HTMLAnchorElement>
  }

export type RedirectProps<
  RM extends RouteMap,
  To extends Extract<keyof RM, string>
> = Omit<RedirectProps_, 'to'> &
  ToParams<RM, To> & {
    innerRef?: React.Ref<React.ReactElement<RedirectProps_>>
  }

export type InParams<
  RM extends RouteMap,
  T extends Extract<keyof RM, string>
> = RM[T]['params']

export type OutParams<
  RM extends RouteMap,
  T extends Extract<keyof RM, string>
> = {
  [K in keyof Extract<RM[T]['params'], Record<string, string>>]?: string
}

export type Routes<RM extends RouteMap = RouteMap> = {
  [RouteKey in keyof RM]: RM[RouteKey]['path']
}

const createTypedRouter = <RM extends RouteMap = RouteMap>(
  routeMap: Routes<RM>
) => {
  const toProps = <RouteKey extends Extract<keyof RM, string>, Props>(
    props: Record<string, any>,
    to: RouteKey,
    params?: RM[RouteKey]['params']
  ) => ({
    ...props,
    to:
      params === null
        ? routeMap[to]
        : generatePath(routeMap[to], params as RouteParams),
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
          ? path.map(k => routeMap[k])
          : routeMap[path],
    }
  }

  const Route = forwardRef<any, RouteProps<RM>>(
    (props: RouteProps<RM>, ref: any) =>
      React.createElement(Route_, pathProps(props, ref))
  )

  const Switch: React.FC<SwitchProps> = forwardRef(
    ({location, children}, ref) => {
      const contextLocation = useLocation()
      const realLocation = location || contextLocation
      const contextMatch = useRouteMatch_<any>()
      let element: React.ReactElement | null = null
      let computedMatch: match<any> | null = null

      React.Children.forEach(children, child => {
        if (computedMatch == null && React.isValidElement(child)) {
          element = child
          const path =
            routeMap[child.props.path || child.props.from || child.props.to]

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

  function createAsyncRoute<P = RouteProps<RM>>(
    component: AsyncComponentGetter<any>,
    options?: AsyncRouteOptions<any>
  ) {
    return createAsyncRoute_<P>(component, {...options, route: Route})
  }

  return {
    Router,
    StaticRouter,
    BrowserRouter,
    HashRouter,
    MemoryRouter,
    Prompt,
    Switch,
    Route,
    Link: <To extends Extract<keyof RM, string>>({
      to,
      params,
      innerRef,
      ...props
    }: LinkProps<RM, To>) =>
      React.createElement(
        Link_,
        toProps({...props, ref: innerRef}, to, params)
      ),
    NavLink: <To extends Extract<keyof RM, string>>({
      to,
      params,
      innerRef,
      ...props
    }: NavLinkProps<RM, To>) =>
      React.createElement(
        NavLink_,
        toProps({...props, ref: innerRef}, to, params)
      ),
    Redirect: <To extends Extract<keyof RM, string>>({
      to,
      params,
      innerRef,
      ...props
    }: RedirectProps<RM, To>): React.ReactElement<RedirectProps_> =>
      React.createElement(
        Redirect_,
        toProps({...props, ref: innerRef}, to, params)
      ),
    useHistory,
    useLocation,
    useParams: <RouteKey extends Extract<keyof RM, string>>(): OutParams<
      RM,
      RouteKey
    > => useParams_(),
    useRouteMatch: <RouteKey extends Extract<keyof RM, string>>(
      routeKey: RouteKey | RouteKey[] | RouteProps<RM>
    ): match<OutParams<RM, RouteKey>> | null =>
      useRouteMatch_(
        Array.isArray(routeKey)
          ? routeKey.map(k => routeMap[k])
          : typeof routeKey === 'object'
          ? pathProps(routeKey)
          : routeMap[routeKey]
      ),
    matchPath: <RouteKey extends Extract<keyof RM, string>>(
      pathname: string,
      props: RouteProps<RM>,
      parent?: match<OutParams<RM, RouteKey>> | null
    ) => matchPath_(pathname, pathProps(props), parent),
    generatePath,
    withRouter,
    __RouterContext,
    createAsyncRoute,
  }
}

export default createTypedRouter
