import * as React from 'react'
import {
  BrowserRouter,
  Router,
  StaticRouter,
  generatePath as generatePath_,
  HashRouter,
  Link as Link_,
  MemoryRouter,
  matchPath as matchPath_,
  NavLink as NavLink_,
  Prompt,
  Redirect as Redirect_,
  Route as Route_,
  useHistory as useHistory_,
  useLocation as useLocation_,
  useParams as useParams_,
  useRouteMatch as useRouteMatch_,
  withRouter,
  match,
} from 'react-router-dom'
import type {
  RouteComponentProps,
  RouteChildrenProps,
  RouteProps as RouteProps_,
  RedirectProps as RedirectProps_,
  LinkProps as LinkProps_,
  NavLinkProps as NavLinkProps_,
} from 'react-router-dom'
import {__RouterContext, useRouteMatch} from 'react-router'
import type {
  StaticContext,
  StaticRouterProps as StaticRouterProps_,
  SwitchProps,
} from 'react-router'
import type {History, Location, LocationState} from 'history'
import pathToRegExp from 'path-to-regexp'

export function createRouter<
  T extends RouteTypes = RouteTypes,
  Context = StaticContext
>(routes: Routes<T>) {
  function toProp<To extends Extract<keyof T, string>>(
    to: ToProp<To>,
    params?: T[To]['params'],
    state?: T[To]['state']
  ): ToObject {
    if (typeof to === 'string') {
      const href = generatePath(to, params)
      const [initialPathname, ...hash] = href.split('#')
      const [pathname, ...search] = initialPathname.split('?')

      return {
        pathname,
        search: search.length ? `?${search.join('?')}` : '',
        hash: hash.length ? `#${hash.join('#')}` : '',
        state,
      }
    }
    // Yes, the intent is for to.state to overwrite state if it exists
    return state ? Object.assign({state}, to) : to
  }

  function generatePath<To extends Extract<keyof typeof routes, string>>(
    to: To,
    params: T[To]['params'] = {}
  ) {
    return generatePath_(routes[to], params as any)
  }

  function toProps<To extends Extract<keyof T, string>>({
    to,
    params,
    state,
    innerRef,
    ...props
  }: RedirectProps<T, To> | LinkProps<T, To> | NavLinkProps<T, To>): any {
    return {
      ...props,
      ref: innerRef,
      to:
        params === null
          ? routes[to]
          : state
          ? toProp(to, params, state)
          : generatePath(to, params),
    }
  }

  function pathProps(props: Record<string, any>, ref?: any) {
    const path = props.path || props.to
    return {
      ...props,
      ref,
      path:
        path === void 0
          ? path
          : Array.isArray(path)
          ? path.map((k) => routes[k])
          : routes[path],
    }
  }

  function Route<To extends Extract<keyof T, string>>({
    innerRef,
    params,
    ...props
  }: RouteProps<T, To, Context>): React.ReactElement<RouteProps_> {
    const nextProps = pathProps(props, innerRef) as RouteProps_
    if (params && typeof nextProps.path === 'string') {
      const tokens = pathToRegExp.parse(nextProps.path as string)
      const nextTokens: typeof tokens = []

      for (const token of tokens) {
        if (typeof token === 'string') {
          nextTokens.push(token)
        } else if (params.hasOwnProperty(token.name) && !token.asterisk) {
          nextTokens.push(token)
        } else if (token.asterisk) {
          nextTokens.push(`${token.prefix}*`)
        } else {
          nextTokens.push(
            `${token.prefix}:${token.name}(${token.pattern})${
              token.optional ? '?' : ''
            }${token.repeat ? '+' : ''}`
          )
        }
      }

      nextProps.path = pathToRegExp.tokensToFunction(nextTokens)(params as any)
    }

    return React.createElement(Route_, nextProps)
  }

  function Switch({location, children}: SwitchProps) {
    const contextLocation = useLocation_()
    const realLocation = location || contextLocation
    const contextMatch = useRouteMatch_<any>()
    let element: React.ReactElement | null = null
    let computedMatch: match<any> | null = null

    React.Children.forEach(children, (child) => {
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
        })
      : null
  }

  return {
    Router,
    BrowserRouter,
    HashRouter,
    MemoryRouter,
    StaticRouter: React.forwardRef((props: StaticRouterProps<Context>, ref) =>
      React.createElement(StaticRouter, Object.assign({ref}, props))
    ),
    Prompt,
    Switch,
    Route,
    Link<To extends Extract<keyof T, string>>(props: LinkProps<T, To>) {
      return React.createElement(Link_, toProps(props))
    },
    NavLink<To extends Extract<keyof T, string>>(props: NavLinkProps<T, To>) {
      return React.createElement(NavLink_, toProps(props))
    },
    Redirect<To extends Extract<keyof T, string>>(
      props: RedirectProps<T, To>
    ): React.ReactElement<RedirectProps_> {
      return React.createElement(Redirect_, toProps(props))
    },
    useHistory<To extends Extract<keyof T, string>>(): History<T[To]['state']> {
      return useHistory_()
    },
    useLocation<To extends Extract<keyof T, string>>(): Location<
      T[To]['state']
    > {
      return useLocation_()
    },
    useParams<To extends Extract<keyof T, string>>(): OutParams<T, To> {
      return useParams_()
    },
    useRouteMatch<To extends Extract<keyof T, string>>(
      to?: To | To[] | RouteProps<T, To, Context>
    ): match<OutParams<T, To>> | null {
      return useRouteMatch(
        // @ts-expect-error
        ...(to
          ? Array.isArray(to)
            ? [to.map((k) => routes[k])]
            : typeof to === 'object'
            ? [pathProps(to)]
            : [routes[to]]
          : ([] as const))
      )
    },
    matchPath<To extends Extract<keyof T, string>>(
      pathname: string,
      props: RouteProps<T, To, Context>,
      parent?: match<OutParams<T, To>> | null
    ) {
      return matchPath_(pathname, pathProps(props), parent)
    },
    generatePath,
    withRouter,
    __RouterContext,
  }
}

export type RouteParams = {
  [paramName: string]: string | number | boolean | undefined
}

export interface RouteTypes {
  [to: string]: {
    path: string
    params: RouteParams | null
    state: LocationState | null
  }
}

export type ToProp<To extends string = any> = To | ToObject

export type ToObject = {
  pathname: string
  search?: string
  hash?: string
  state?: LocationState
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

// @ts-expect-error
export interface RouteProps<
  T extends RouteTypes,
  To extends Extract<keyof T, string>,
  Context = StaticContext
> extends RouteProps_ {
  to?: To | To[] | '*'
  path?: To | To[] | '*'
  params?: Partial<T[To]['params']>
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
