function generateRedirectResponse(value: string) {
  return {
    status: '301',
    statusDescription: 'Found',
    headers: {
      location: [
        {
          key: 'Location',
          value: value,
        },
      ],
    },
  };
}

export const handler = (event: any, _context: any, callback: any): void => {
  const request = event.Records[0].cf.request;

  let prefixPath;

  if (request.uri.match(/\/$/)) {
    request.uri += 'index.html';
    callback(null, request);
  } else if ((prefixPath = request.uri.match('(.+)/index.html'))) {
    callback(null, generateRedirectResponse(prefixPath[1] + '/'));
  } else if (request.uri.match('/[^/.]+$')) {
    callback(null, generateRedirectResponse(request.uri + '/'));
  } else {
    callback(null, request);
  }
};
