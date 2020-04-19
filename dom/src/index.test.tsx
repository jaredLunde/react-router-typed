import React from 'react'
import ReactDOMServer from 'react-dom/server'
import {createRouter} from './index'

describe('<StaticRouter>', () => {
  const {
    StaticRouter: Router,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
  } = createRouter({
    thePath: '/the/path',
    somewhereElse: '/somewhere-else?the=query',
  })

  describe('with a string location prop', () => {
    it('parses the location into an object', () => {
      let location
      function LocationChecker(props) {
        location = useLocation()
        return null
      }

      ReactDOMServer.renderToStaticMarkup(
        <Router location="/the/path?the=query#the-hash">
          <Routes>
            <Route to="thePath" element={<LocationChecker />} />
          </Routes>
        </Router>
      )

      expect(location).toMatchObject({
        pathname: '/the/path',
        search: '?the=query',
        hash: '#the-hash',
        state: {},
        key: expect.any(String),
      })
    })
  })

  describe('with an object location prop', () => {
    it('adds missing properties', () => {
      let location
      function LocationChecker(props) {
        location = useLocation()
        return null
      }

      ReactDOMServer.renderToStaticMarkup(
        <Router location={{pathname: '/the/path', search: '?the=query'}}>
          <Routes>
            <Route to="thePath" element={<LocationChecker />} />
          </Routes>
        </Router>
      )

      expect(location).toMatchObject({
        pathname: '/the/path',
        search: '?the=query',
        hash: '',
        state: {},
        key: expect.any(String),
      })
    })
  })

  describe('with a <Link to> string', () => {
    it('uses the right href', () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <Router location="/">
          <Link to="thePath" />
        </Router>
      )

      expect(html).toContain('href="/the/path"')
    })
  })

  describe('with a <Link to> object', () => {
    it('uses the right href', () => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <Router location="/">
          <Link to={{pathname: '/the/path'}} />
        </Router>
      )

      expect(html).toContain('href="/the/path"')
    })
  })

  let consoleWarn
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
  })

  it('warns about using on the initial render', () => {
    function Home() {
      return <Navigate to="somewhereElse" />
    }

    ReactDOMServer.renderToStaticMarkup(
      <Router location="/the/path">
        <Routes>
          <Route to="thePath" element={<Home />} />
        </Routes>
      </Router>
    )

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringMatching('<Navigate> must not be used on the initial render')
    )
  })
})
