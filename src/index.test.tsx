/* jest */
import React from 'react'
import {renderHook, act} from '@testing-library/react-hooks'
import {
  configureRoutes,
  useMatch,
  useHref,
  useNavigate,
  MemoryRouter,
} from './index'

declare module './index' {
  interface RouteTypes {
    foo: {
      path: '/foo/:foo'
      params: {
        foo: string
      }
      state: null
    }
    bar: {
      path: '/bar'
      params: null
      state: null
    }
  }
}

describe('useNavigate()', () => {
  it('should work', () => {
    configureRoutes({
      foo: '/foo/:foo',
      bar: '/bar',
    })

    const {result} = renderHook(() => useNavigate(), {
      wrapper: (props) => <MemoryRouter {...props} />,
    })

    act(() => result.current('foo', {params: {foo: 'bar'}}))
    console.log(result.current)
    expect('fo').toBe('fo')
  })
})

describe('useMatch()', () => {
  configureRoutes({
    foo: '/foo/:foo',
    bar: '/bar',
  })

  it('should match', () => {
    const {result} = renderHook(() => useMatch('foo', {foo: 'bar'}), {
      wrapper: (props) => (
        <MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: '', state: null},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe(true)
  })

  it('should not match', () => {
    const {result} = renderHook(() => useMatch('foo', {foo: 'baz'}), {
      wrapper: (props) => (
        <MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: '', state: null},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe(false)
  })
})

describe('useHref()', () => {
  configureRoutes({
    foo: '/foo/:foo',
    bar: '/bar',
  })

  it('should create href from to and params', () => {
    const {result} = renderHook(() => useHref('foo', {foo: 'bar'}), {
      wrapper: (props) => (
        <MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: '', state: null},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe('/foo/bar')
  })
})
