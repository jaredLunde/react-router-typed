import React from 'react'
import {
  BrowserRouter,
  Router,
  StaticRouter,
  generatePath,
  HashRouter,
  Link as Link_,
  MemoryRouter,
  matchPath,
  NavLink as NavLink_,
  Prompt,
  Redirect,
  Route as Route_,
  Switch,
  useHistory,
  useLocation,
  useParams as useParams_,
  useRouteMatch as useRouteMatch_,
  withRouter,
  // Types
  LinkProps as LinkProps_,
  RouteProps as RouteProps_,
  match,
} from 'react-router-dom'

export interface RouteMap {
  [routeKey: string]: {
    matchPath: string | string[]
    params?: Record<string, string> | null
  }
}

type FooRouteMap = {
  foo: {
    matchPath: '/foo/:bar'
    params: {
      bar: 'baz' | 'buzz'
    }
  }
  bar: {
    matchPath: '/bar'
  }
  baz: {
    matchPath: '/foo/:bar?'
    params: null | {
      bar: 'baz' | 'buzz'
    }
  }
}

export interface RouteProps<RM extends RouteMap> extends RouteProps_ {
  path: RM[keyof RM]['matchPath']
}

const createRoute = <RM extends RouteMap = RouteMap>(): React.FC<RouteProps<
  RM
>> => props => <Route_ {...props} />

export type LinkProps<
  RM extends RouteMap,
  To extends Extract<keyof RM, string>
> = LinkProps_<any> &
  (undefined extends RM[To]['params']
    ? {
        to: To
        params?: never
      }
    : null extends RM[To]['params']
    ? {
        to: To
        params?: RM[To]['params']
      }
    : {
        to: To
        params: RM[To]['params']
      })

const createLink = <RM extends RouteMap = RouteMap>() => <
  T extends Extract<keyof RM, string>
>({
  to,
  params,
  ...props
}: LinkProps<RM, T>): React.ReactElement => {
  return React.createElement(Link_, Object.assign(props, {to}))
}

const createNavLink = <RM extends RouteMap = RouteMap>() => <
  T extends Extract<keyof RM, string>
>({
  to,
  params,
  ...props
}: LinkProps<RM, T>): React.ReactElement => {
  return React.createElement(NavLink_, Object.assign(props, {to}))
}

export type Params<RM extends RouteMap, T extends Extract<keyof RM, string>> = {
  [K in keyof Extract<RM[T]['params'], Record<string, string>>]?: string
}

const createUseParams = <RM extends RouteMap = RouteMap>() => <
  RouteKey extends Extract<keyof RM, string>
>(): Params<RM, RouteKey> => useParams_()

const createUseRouteMatch = <RM extends RouteMap = RouteMap>() => <
  RouteKey extends Extract<keyof RM, string>
>(): match<Params<RM, RouteKey>> => useRouteMatch_()

const createTypedRouter = <RM extends RouteMap = RouteMap>() => {
  return {
    Router,
    StaticRouter,
    BrowserRouter,
    HashRouter,
    MemoryRouter,
    Route: createRoute<RM>(),
    Link: createLink<RM>(),
    NavLink: createNavLink<RM>(),
    Prompt,
    Redirect,
    Switch,
    useHistory,
    useLocation,
    useParams: createUseParams<RM>(),
    useRouteMatch: createUseRouteMatch<RM>(),
    withRouter,
    generatePath,
    matchPath,
  }
}

const {useParams, Route, Link} = createRouter<FooRouteMap>()
const R = <Route path="/foo/:bar" />
const R2 = <Route path="/foo/:bar?" />
const L = <Link to="foo" params={{bar: 'baz'}} />
const L2 = <Link to="bar" />
const L3 = <Link to="baz" />
const up = useParams<'foo'>()
up.bar
