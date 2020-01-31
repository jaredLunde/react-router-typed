/* jest */
import React from 'react'
import {renderHook} from '@testing-library/react-hooks'
import {render, act} from '@testing-library/react'
import * as ReactRouterDom from 'react-router-dom'
import createTypedRouter from './index'

type FooRouteMap = {
  foo: {
    path: '/foo/:bar'
    params: {
      bar: 'baz' | 'buzz'
    }
  }
  bar: {
    path: '/bar'
  }
  baz: {
    path: '/foo/:bar?'
    params: null | {
      bar: 'baz' | 'buzz'
    }
  }
}

describe('createTypedRouter()', () => {
  it('should have the same exports as react-router-dom', () => {
    expect([...Object.keys(createTypedRouter({})), 'default'].sort()).toEqual(
      [...Object.keys(ReactRouterDom), 'createAsyncRoute'].sort()
    )
  })
})

describe('<Route>', () => {
  it('should create', () => {
    const {StaticRouter, Route} = createTypedRouter<{foo: {path: '/foo'}}>({
      foo: '/foo',
    })

    let result = render(<Route path="foo" children={<div />} />, {
      wrapper: ({children}) => (
        <StaticRouter location="/foo" children={children} />
      ),
    })

    expect(result.asFragment()).toMatchSnapshot('<div/>')

    result = render(<Route path="foo" children={<div />} />, {
      wrapper: ({children}) => (
        <StaticRouter location="/" children={children} />
      ),
    })

    expect(result.asFragment()).toMatchSnapshot('empty')
  })
})

describe('<Redirect>', () => {
  const {StaticRouter, Redirect} = createTypedRouter<{
    foo: {path: '/foo'}
  }>({
    foo: '/foo',
  })

  it('should create', () => {
    const context: Record<any, any> = {}

    render(<Redirect to="foo" />, {
      wrapper: ({children}) => (
        <StaticRouter context={context} location="/" children={children} />
      ),
    })

    expect(context.url).toBe('/foo')
  })
})

describe('<Link>', () => {
  const {StaticRouter, Link} = createTypedRouter<{
    foo: {path: '/foo'; params: null}
    bar: {
      path: '/bar/:baz'
      params: {
        baz: 'boz'
      }
    }
  }>({
    foo: '/foo',
    bar: '/bar/:baz',
  })

  const wrapper = ({children}) => (
    <StaticRouter location="/foo" children={children} />
  )

  it('should render proper path', () => {
    const result = render(<Link to="foo" />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })

  it('should render proper path w/ params', () => {
    const result = render(<Link to="bar" params={{baz: 'boz'}} />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })
})

describe('<NavLink>', () => {
  const {StaticRouter, NavLink} = createTypedRouter<FooRouteMap>({
    foo: '/foo/:bar',
    bar: '/bar',
    baz: '/foo/:bar?',
  })

  const wrapper = ({children}) => (
    <StaticRouter location="/foo" children={children} />
  )

  it('should render proper path', () => {
    const result = render(<NavLink to="bar" />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })

  it('should render proper path w/ params', () => {
    const result = render(<NavLink to="foo" params={{bar: 'boz'}} />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })
})

describe('matchPath()', () => {
  const {matchPath} = createTypedRouter<{
    profile: {
      path: '/users/:id'
      params: {
        id: number
      }
    }
  }>({
    profile: '/users/:id',
  })

  it('should work', () => {
    const match = matchPath('/users/123', {
      path: 'profile',
      exact: true,
      strict: false,
    })

    expect(match).toEqual({
      isExact: true,
      path: '/users/:id',
      url: '/users/123',
      params: {id: '123'},
    })
  })
})

describe('useParams()', () => {
  it('should return the right params', () => {
    const {StaticRouter, Route, useParams} = createTypedRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}}
    }>({
      foo: '/foo/:bar',
    })

    const {result} = renderHook(() => useParams<'foo'>(), {
      wrapper: ({children}) => (
        <StaticRouter
          location="/foo/bar"
          children={<Route path="foo" children={children} />}
        />
      ),
    })

    expect(result.current.bar).toBe('bar')
  })
})

describe('useRouteMatch()', () => {
  it('should return the right params for a string', () => {
    const {StaticRouter, Route, useRouteMatch} = createTypedRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}}
    }>({
      foo: '/foo/:bar',
    })

    const {result} = renderHook(() => useRouteMatch('foo'), {
      wrapper: ({children}) => (
        <StaticRouter
          location="/foo/bar"
          children={<Route path="foo" children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })

  it('should return the right params for an array', () => {
    const {StaticRouter, Route, useRouteMatch} = createTypedRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}}
      bar: {path: '/bar/:bar'; params: {bar: string}}
    }>({
      foo: '/foo/:bar',
      bar: '/bar/:bar',
    })

    const {result} = renderHook(() => useRouteMatch(['foo', 'bar']), {
      wrapper: ({children}) => (
        <StaticRouter
          location="/foo/bar"
          children={<Route path="foo" children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })

  it('should return the right params for an object', () => {
    const {StaticRouter, Route, useRouteMatch} = createTypedRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}}
      bar: {path: '/bar/:bar'; params: {bar: string}}
    }>({
      foo: '/foo/:bar',
      bar: '/bar/:bar',
    })

    const {result} = renderHook(() => useRouteMatch({to: ['foo', 'bar']}), {
      wrapper: ({children}) => (
        <StaticRouter
          location="/foo/bar"
          children={<Route path="foo" children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })
})

describe('createAsyncRoute()', () => {
  const {StaticRouter, Switch, createAsyncRoute} = createTypedRouter<{
    foo: {path: '/foo'}
    bar: {path: '/bar'}
    home: {path: '/'}
  }>({foo: '/foo', bar: '/bar', home: '/'})
  const ComponentModule = {
    default: ({children}) => <div children={children} />,
  }

  it('should load regular components w/o loading state', () => {
    const HomeRoute = createAsyncRoute(() => ComponentModule, {
      loading: () => 'Loading...',
    })

    let result
    act(() => {
      result = render(<HomeRoute to="foo" />, {
        wrapper: props => <StaticRouter location="/foo" {...props} />,
      })
    })

    expect(result.asFragment()).toMatchSnapshot()
  })

  it('should load regular components w/o loading state or options', () => {
    const HomeRoute = createAsyncRoute(() => ComponentModule)

    let result
    act(() => {
      result = render(<HomeRoute path="foo" />, {
        wrapper: props => <StaticRouter location="/foo" {...props} />,
      })
    })

    expect(result.asFragment()).toMatchSnapshot()
  })

  it('should display the correct route', () => {
    const HomeRoute = createAsyncRoute(() => ComponentModule)

    let result
    act(() => {
      result = render(
        <>
          <HomeRoute path="foo" children="foo" />
          <HomeRoute path="bar" children="bar" />
          <HomeRoute path={['foo', 'bar']} children=" - foobar" />
          <HomeRoute path="home" exact children="home" />
        </>,
        {
          wrapper: props => (
            <StaticRouter
              location="/foo"
              {...props}
              children={<Switch>{props.children}</Switch>}
            />
          ),
        }
      )
    })

    expect(result.asFragment()).toMatchSnapshot()
  })
})
