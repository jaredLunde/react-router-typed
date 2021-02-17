import * as React from 'react';
import { BrowserRouter, Router, HashRouter, MemoryRouter, Prompt, withRouter, match } from 'react-router-dom';
import type { RouteComponentProps, RouteChildrenProps, RouteProps as RouteProps_, RedirectProps as RedirectProps_, LinkProps as LinkProps_, NavLinkProps as NavLinkProps_ } from 'react-router-dom';
import type { StaticContext, StaticRouterProps as StaticRouterProps_, SwitchProps } from 'react-router';
import type { History, Location, LocationState } from 'history';
export declare function createRouter<T extends RouteTypes = RouteTypes, Context = StaticContext>(routes: Routes<T>): {
    Router: typeof Router;
    BrowserRouter: typeof BrowserRouter;
    HashRouter: typeof HashRouter;
    MemoryRouter: typeof MemoryRouter;
    StaticRouter: React.ForwardRefExoticComponent<StaticRouterProps<Context> & React.RefAttributes<unknown>>;
    Prompt: typeof Prompt;
    Switch: ({ location, children }: SwitchProps) => React.FunctionComponentElement<{
        location: Location<unknown>;
        computedMatch: never;
    }> | null;
    Route: <To extends Extract<keyof T, string>>({ innerRef, params, ...props }: RouteProps<T, To, Context>) => React.ReactElement<RouteProps_>;
    Link<To_1 extends Extract<keyof T, string>>(props: LinkProps<T, To_1>): React.FunctionComponentElement<LinkProps_<unknown> & React.RefAttributes<HTMLAnchorElement>>;
    NavLink<To_2 extends Extract<keyof T, string>>(props: NavLinkProps<T, To_2>): React.FunctionComponentElement<NavLinkProps_<unknown> & React.RefAttributes<HTMLAnchorElement>>;
    Redirect<To_3 extends Extract<keyof T, string>>(props: RedirectProps<T, To_3>): React.ReactElement<RedirectProps_>;
    useHistory<To_4 extends Extract<keyof T, string>>(): History<T[To_4]["state"]>;
    useLocation<To_5 extends Extract<keyof T, string>>(): Location<T[To_5]["state"]>;
    useParams<To_6 extends Extract<keyof T, string>>(): OutParams<T, To_6>;
    useRouteMatch<To_7 extends Extract<keyof T, string>>(to?: To_7 | RouteProps<T, To_7, Context> | To_7[] | undefined): match<OutParams<T, To_7>> | null;
    matchPath<To_8 extends Extract<keyof T, string>>(pathname: string, props: RouteProps<T, To_8, Context>, parent?: match<OutParams<T, To_8>> | null | undefined): match<OutParams<T, To_8>> | null;
    generatePath: <To_9 extends Extract<keyof T, string>>(to: To_9, params?: T[To_9]["params"]) => string;
    withRouter: typeof withRouter;
    __RouterContext: React.Context<RouteComponentProps<{}, StaticContext, unknown>>;
};
export declare type RouteParams = {
    [paramName: string]: string | number | boolean | undefined;
};
export interface RouteTypes {
    [to: string]: {
        path: string;
        params: RouteParams | null;
        state: LocationState | null;
    };
}
export declare type ToProp<To extends string = any> = To | ToObject;
export declare type ToObject = {
    pathname: string;
    search?: string;
    hash?: string;
    state?: LocationState;
};
export declare type ToParams<T extends RouteTypes, To extends Extract<keyof T, string>> = {
    to: To;
    params?: T[To]['params'];
    state?: T[To]['state'];
};
export declare type LinkProps<T extends RouteTypes, To extends Extract<keyof T, string>> = LinkProps_ & ToParams<T, To> & {
    ref?: never;
    innerRef?: React.Ref<HTMLAnchorElement>;
};
export declare type NavLinkProps<T extends RouteTypes, To extends Extract<keyof T, string>> = NavLinkProps_ & ToParams<T, To> & {
    ref?: never;
    innerRef?: React.Ref<HTMLAnchorElement>;
};
export declare type RedirectProps<T extends RouteTypes, To extends Extract<keyof T, string>> = Omit<RedirectProps_, 'to'> & ToParams<T, To> & {
    innerRef?: React.Ref<React.ReactElement<RedirectProps_>>;
};
export declare type OutParams<T extends RouteTypes, To extends Extract<keyof T, string>> = {
    [K in keyof Extract<T[To]['params'], Record<string, string>>]?: string;
};
export declare type Routes<T extends RouteTypes = RouteTypes> = {
    [To in keyof T]: T[To]['path'];
};
export interface StaticRouterProps<Context> extends StaticRouterProps_ {
    context?: Context & StaticContext;
    children?: React.ReactNode;
}
export interface RouteProps<T extends RouteTypes, To extends Extract<keyof T, string>, Context = StaticContext> extends RouteProps_ {
    to?: To | To[] | '*';
    path?: To | To[] | '*';
    params?: Partial<T[To]['params']>;
    component?: React.ComponentType<RouteComponentProps<OutParams<T, To>, Context & StaticContext, T[To]['state']>> | React.ComponentType<any>;
    ref?: never;
    innerRef?: React.Ref<React.ReactElement<RouteProps_>>;
    render?: (props: RouteComponentProps<OutParams<T, To>, Context & StaticContext, T[To]['state']>) => React.ReactNode;
    children?: ((props: RouteChildrenProps<OutParams<T, To>, T[To]['state']>) => React.ReactNode) | React.ReactNode;
}
