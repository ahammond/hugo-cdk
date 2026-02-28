import { handler } from '../src/cloudfront-redirect.cloudfront-redirect';

describe('CloudFront Redirect Handler', () => {
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
  });

  describe('directory path handling', () => {
    it('appends index.html to root path', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/index.html',
      });
    });

    it('appends index.html to directory path with trailing slash', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/blog/index.html',
      });
    });

    it('appends index.html to nested directory path', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/posts/2024/',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/blog/posts/2024/index.html',
      });
    });
  });

  describe('index.html redirect handling', () => {
    it('passes through /index.html unchanged (no redirect at root)', () => {
      // The regex (.+)/index.html requires at least one char before /index.html
      // so /index.html at root doesn't match and passes through
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/index.html',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/index.html',
      });
    });

    it('redirects /blog/index.html to /blog/', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/index.html',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        status: '301',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/blog/',
            },
          ],
        },
      });
    });

    it('redirects nested /blog/posts/2024/index.html to /blog/posts/2024/', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/posts/2024/index.html',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        status: '301',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/blog/posts/2024/',
            },
          ],
        },
      });
    });
  });

  describe('extensionless path redirect handling', () => {
    it('redirects /about to /about/', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/about',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        status: '301',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/about/',
            },
          ],
        },
      });
    });

    it('redirects /blog/posts to /blog/posts/', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/posts',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        status: '301',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/blog/posts/',
            },
          ],
        },
      });
    });
  });

  describe('file path pass-through handling', () => {
    it('passes through CSS file unchanged', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/styles/main.css',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/styles/main.css',
      });
    });

    it('passes through JavaScript file unchanged', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/js/app.js',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/js/app.js',
      });
    });

    it('passes through image file unchanged', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/images/logo.png',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/images/logo.png',
      });
    });

    it('passes through HTML file (not index.html) unchanged', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/404.html',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/404.html',
      });
    });

    it('passes through file with multiple dots unchanged', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/files/document.backup.pdf',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/files/document.backup.pdf',
      });
    });
  });

  describe('edge cases', () => {
    it('treats path with query parameters as extensionless and redirects', () => {
      // The URI includes query parameters, so '/blog/?page=2' matches the extensionless
      // pattern and gets redirected to '/blog/?page=2/'
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/blog/?page=2',
                querystring: 'page=2',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        status: '301',
        statusDescription: 'Found',
        headers: {
          location: [
            {
              key: 'Location',
              value: '/blog/?page=2/',
            },
          ],
        },
      });
    });

    it('handles very long nested path', () => {
      const event = {
        Records: [
          {
            cf: {
              request: {
                uri: '/a/b/c/d/e/f/g/',
              },
            },
          },
        ],
      };

      handler(event, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        uri: '/a/b/c/d/e/f/g/index.html',
      });
    });
  });
});
