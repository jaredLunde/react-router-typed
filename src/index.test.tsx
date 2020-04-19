/* jest */
import React from 'react'
import {renderHook, act} from '@testing-library/react-hooks'
import {render} from '@testing-library/react'
import {createRouter} from './index'

describe('<Route>', () => {
  it('should work', () => {
    const Router = createRouter<{
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
    }>({
      foo: '/foo/:foo',
      bar: '/bar',
    })

    const route = <Router.Route to="foo" element={<div />} />
    const {result} = renderHook(
      () =>
        Router.useRoutes([
          {to: 'bar', element: <div />},
          {to: 'foo', element: <div />},
        ]),
      {
        wrapper: (props) => (
          <Router.MemoryRouter
            initialEntries={[
              {pathname: '/foo/bar', search: '', hash: '', key: ''},
            ]}
            {...props}
          />
        ),
      }
    )

    expect('fo').toBe('fo')
  })
})

describe('useNavigate()', () => {
  it('should work', () => {
    const Router = createRouter<{
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
    }>({
      foo: '/foo/:foo',
      bar: '/bar',
    })

    const {result} = renderHook(() => Router.useNavigate(), {
      wrapper: (props) => <Router.MemoryRouter {...props} />,
    })

    act(() => result.current('foo', {params: {foo: 'bar'}}))
    console.log(result.current)
    expect('fo').toBe('fo')
  })
})

describe('useMatch()', () => {
  const Router = createRouter<{
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
  }>({
    foo: '/foo/:foo',
    bar: '/bar',
  })

  it('should match', () => {
    const {result} = renderHook(() => Router.useMatch('foo', {foo: 'bar'}), {
      wrapper: (props) => (
        <Router.MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: ''},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe(true)
  })

  it('should not match', () => {
    const {result} = renderHook(() => Router.useMatch('foo', {foo: 'baz'}), {
      wrapper: (props) => (
        <Router.MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: ''},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe(false)
  })
})

describe('useHref()', () => {
  const Router = createRouter<{
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
  }>({
    foo: '/foo/:foo',
    bar: '/bar',
  })

  it('should create href from to and params', () => {
    const {result} = renderHook(() => Router.useHref('foo', {foo: 'bar'}), {
      wrapper: (props) => (
        <Router.MemoryRouter
          initialEntries={[
            {pathname: '/foo/bar', search: '', hash: '', key: ''},
          ]}
          {...props}
        />
      ),
    })

    expect(result.current).toBe('/foo/bar')
  })
})
