import React from 'react'
import {renderHook} from '@testing-library/react-hooks'
import {render} from '@testing-library/react'
import * as ReactRouterDom from 'react-router-dom'
import {createRouter} from './index'

type FooRouteMap = {
  foo: {
    path: '/foo/:bar'
    params: {
      bar: 'baz' | 'buzz'
    }
    state: null
  }
  bar: {
    path: '/bar'
    params: null
    state: null
  }
  baz: {
    path: '/foo/:bar?'
    params: null | {
      bar: 'baz' | 'buzz'
    }
    state: null
  }
}

describe('createRouter()', () => {
  it('should have the same exports as react-router-dom', () => {
    expect([...Object.keys(createRouter({})), 'default'].sort()).toEqual(
      [...Object.keys(ReactRouterDom), '__RouterContext'].sort()
    )
  })
})

describe('generatePath()', () => {
  it('should generate path', () => {
    const {generatePath} = createRouter<{
      foo: {path: '/foo'; params: null; state: null}
      bar: {path: '/foo/:bar'; params: {bar: string}; state: null}
    }>({
      foo: '/foo',
      bar: '/foo/:bar',
    })

    expect(generatePath('foo')).toBe('/foo')
    expect(generatePath('bar', {bar: 'bar'})).toBe('/foo/bar')
  })
})

describe('<Route>', () => {
  it('should create', () => {
    const {StaticRouter, Route} = createRouter<
      {
        foo: {path: '/foo'; params: null; state: null}
      },
      {
        chip: 'mukwonago'
      }
    >({
      foo: '/foo',
    })

    let result = render(<Route path='foo' children={<div />} />, {
      wrapper: ({children}) => (
        <StaticRouter
          location='/foo'
          context={{chip: 'mukwonago'}}
          children={children}
        />
      ),
    })

    expect(result.asFragment()).toMatchSnapshot('<div/>')

    result = render(<Route path='foo' children={<div />} />, {
      wrapper: ({children}) => (
        <StaticRouter location='/' children={children} />
      ),
    })

    expect(result.asFragment()).toMatchSnapshot('empty')
  })

  it('should create w/ params', () => {
    const {StaticRouter, Route} = createRouter<{
      foo: {
        path: '/:foo/:bar/*'
        params: {foo: string; bar: string}
        state: null
      }
    }>({
      foo: '/:foo/:bar/*',
    })

    let result = render(
      <Route path='foo' params={{foo: 'bar'}} children={<div />} />,
      {
        wrapper: ({children}) => (
          <StaticRouter location='/bar/bar/baz' children={children} />
        ),
      }
    )

    expect(result.asFragment()).toMatchSnapshot('<div/>')

    result = render(<Route path='foo' children={<div />} />, {
      wrapper: ({children}) => (
        <StaticRouter location='/foo/bar/baz' children={children} />
      ),
    })

    expect(result.asFragment()).toMatchSnapshot('empty')
  })
})

describe('<Redirect>', () => {
  const {StaticRouter, Redirect} = createRouter<{
    foo: {path: '/foo'; params: null; state: null}
  }>({
    foo: '/foo',
  })

  it('should create', () => {
    const context: Record<any, any> = {}

    render(<Redirect to='foo' />, {
      wrapper: ({children}) => (
        <StaticRouter context={context} location='/' children={children} />
      ),
    })

    expect(context.url).toBe('/foo')
  })
})

describe('<Link>', () => {
  const {StaticRouter, Link} = createRouter<{
    foo: {
      path: '/foo'
      params: null
      state: {
        newSignup: boolean
      }
    }
    bar: {
      path: '/bar/:baz'
      params: {
        baz?: 'boz'
      }
      state: null
    }
  }>({
    foo: '/foo',
    bar: '/bar/:baz',
  })

  const wrapper = ({children}) => (
    <StaticRouter location='/foo' children={children} />
  )

  it('should render proper path', () => {
    const result = render(<Link to='foo' state={{newSignup: true}} />, {
      // @ts-expect-error
      wrapper,
    })
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })

  it('should render proper path w/ params', () => {
    // @ts-expect-error
    const result = render(<Link to='bar' params={{baz: 'boz'}} />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })
})

describe('<NavLink>', () => {
  const {StaticRouter, NavLink} = createRouter<FooRouteMap>({
    foo: '/foo/:bar',
    bar: '/bar',
    baz: '/foo/:bar?',
  })

  const wrapper = ({children}) => (
    <StaticRouter location='/foo' children={children} />
  )

  it('should render proper path', () => {
    // @ts-expect-error
    const result = render(<NavLink to='bar' />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })

  it('should render proper path w/ params', () => {
    // @ts-expect-error
    const result = render(<NavLink to='foo' params={{bar: 'baz'}} />, {wrapper})
    expect(result.asFragment()).toMatchSnapshot('<div/>')
  })
})

describe('matchPath()', () => {
  const {matchPath} = createRouter<{
    profile: {
      path: '/users/:id'
      params: {
        id: number
      }
      state: null
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
    const {StaticRouter, Route, useParams} = createRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}; state: null}
    }>({
      foo: '/foo/:bar',
    })

    const {result} = renderHook(() => useParams<'foo'>(), {
      wrapper: ({children}) => (
        <StaticRouter
          location='/foo/bar'
          children={<Route path='foo' children={children} />}
        />
      ),
    })

    expect(result.current.bar).toBe('bar')
  })
})

describe('useRouteMatch()', () => {
  it('should return the right params for a string', () => {
    const {StaticRouter, Route, useRouteMatch} = createRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}; state: null}
    }>({
      foo: '/foo/:bar',
    })

    const {result} = renderHook(() => useRouteMatch('foo'), {
      wrapper: ({children}) => (
        <StaticRouter
          location='/foo/bar'
          children={<Route path='foo' children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })

  it('should return the right params for an array', () => {
    const {StaticRouter, Route, useRouteMatch} = createRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}; state: null}
      bar: {path: '/bar/:bar'; params: {bar: string}; state: null}
    }>({
      foo: '/foo/:bar',
      bar: '/bar/:bar',
    })

    const {result} = renderHook(() => useRouteMatch(['foo', 'bar']), {
      wrapper: ({children}) => (
        <StaticRouter
          location='/foo/bar'
          children={<Route path='foo' children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })

  it('should return the right params for an object', () => {
    const {StaticRouter, Route, useRouteMatch} = createRouter<{
      foo: {path: '/foo/:bar'; params: {bar: string}; state: null}
      bar: {path: '/bar/:bar'; params: {bar: string}; state: null}
    }>({
      foo: '/foo/:bar',
      bar: '/bar/:bar',
    })

    const {result} = renderHook(() => useRouteMatch({to: ['foo', 'bar']}), {
      wrapper: ({children}) => (
        <StaticRouter
          location='/foo/bar'
          children={<Route path='foo' children={children} />}
        />
      ),
    })

    expect(result.current.params.bar).toBe('bar')
  })
})
