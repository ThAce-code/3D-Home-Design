import { afterEach, beforeEach } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  document.body.innerHTML = '<div id="test-root"></div>'
})

afterEach(() => {
  document.body.innerHTML = ''
})
